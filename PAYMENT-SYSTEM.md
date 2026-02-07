# Tribbe Payment System — Architecture & Issue Report

## Overview

Tribbe uses **Razorpay** to handle paid event registrations. When a user clicks "Register Now" on a paid event, the system creates a payment order, opens the Razorpay checkout modal, and upon successful payment, creates an RSVP (registration) for the user.

---

## Payment Flow (Step by Step)

```
User clicks "Register Now"
        │
        ▼
┌──────────────────────────┐
│  1. Capacity Check       │  GET /api/events/:id/check-capacity
│     (Client-side)        │  → Prevents opening payment modal if event is full
└──────────┬───────────────┘
           │ capacity available
           ▼
┌──────────────────────────┐
│  2. Create Order         │  POST /api/payments/create-order
│     (Server-side)        │  → Creates Razorpay order + DB record (status: 'created')
└──────────┬───────────────┘
           │ returns orderId
           ▼
┌──────────────────────────┐
│  3. Razorpay Checkout    │  Opens Razorpay modal in browser
│     (Client-side)        │  → User enters card/UPI details and pays
└──────────┬───────────────┘
           │ payment completed
           ▼
┌──────────────────────────────────────────────────────┐
│  4. THREE parallel confirmation paths trigger:       │
│                                                      │
│  PATH A: Client Polling (fastest, 1-3 seconds)       │
│    → Polls GET /api/payments/status/:eventId         │
│    → Server triggers immediate reconciliation        │
│    → Checks Razorpay API for payment status          │
│    → Creates RSVP if payment captured                │
│                                                      │
│  PATH B: Webhook (instant, server-to-server)         │
│    → Razorpay sends POST /api/payments/webhook       │
│    → Verifies signature, creates RSVP atomically     │
│                                                      │
│  PATH C: Cron Job (safety net, every 6 hours)        │
│    → Checks for stuck payments older than 10 min     │
│    → Reconciles with Razorpay API                    │
└──────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────┐
│  5. UI Update            │  queryClient.invalidateQueries() refetches event
│     (Client-side)        │  → event.rsvps now includes user → button shows "Registered"
└──────────────────────────┘
```

---

## Key Files

| File | Purpose |
|------|---------|
| `client/src/components/PaymentModal.tsx` | Razorpay checkout UI + polling logic |
| `client/src/pages/event-details.tsx` | Register button, RSVP state, payment modal trigger |
| `server/payment-routes.ts` | Payment API endpoints + webhook handler |
| `server/payments.ts` | PaymentService class (Razorpay API, order creation, signature verification) |
| `server/payment-reconciliation.ts` | Reconciliation service (checks Razorpay API for stuck payments) |
| `server/payment-reconciliation-cron.ts` | Cron job running every 6 hours |
| `server/index.ts` | Express middleware setup (critical for webhook body parsing) |

---

## Database Tables

### `payment_transactions`
| Column | Type | Description |
|--------|------|-------------|
| id | serial | Primary key |
| eventId | integer | Event being paid for |
| userId | text | User making payment |
| razorpayOrderId | text | Razorpay order ID |
| razorpayPaymentId | text | Razorpay payment ID (set after capture) |
| amount | integer | Amount in paise (₹100 = 10000) |
| currency | text | INR |
| status | text | created → authorized → captured / failed |
| paymentMethod | text | card, upi, etc. |
| createdAt | timestamp | When order was created |
| updatedAt | timestamp | Last status change |

### `event_rsvps`
| Column | Type | Description |
|--------|------|-------------|
| eventId | integer | Event ID |
| userId | text | User ID |
| status | text | going, maybe, not_going |
| Unique constraint | (eventId, userId) | One RSVP per user per event |

### `events`
| Column | Type | Description |
|--------|------|-------------|
| current_capacity | integer | Atomic counter incremented when RSVP created |
| max_guests | integer | Maximum capacity (null = unlimited) |
| ticketPrice | numeric | Price in rupees (0 = free event) |

---

## RSVP Creation Logic (Atomic Transaction)

When payment is captured (via webhook, polling, or reconciliation), the RSVP is created in a single database transaction:

```
BEGIN TRANSACTION
  1. Update payment_transactions.status = 'captured'
  2. IDEMPOTENCY CHECK: Does user already have 'going' RSVP?
     → YES: Skip (prevents duplicate capacity increments)
     → NO: Continue
  3. ATOMIC CAPACITY: UPDATE events SET current_capacity + 1
     WHERE current_capacity < max_guests
     → FAIL: Event full, throw error (refund needed)
     → SUCCESS: Continue
  4. UPSERT event_rsvps with status = 'going'
COMMIT
```

This ensures:
- No double-counting capacity on webhook retries
- No RSVP created if event is full (even with race conditions)
- Payment status and RSVP are always in sync

---

## Issues Found & Fixed

### Issue 1: Webhook 502/400 Errors (Server Crash)

**Symptom**: All Razorpay webhooks returned 400 or 502 status codes.

**Root Cause**: `express.json()` middleware in `server/index.ts` was applied globally, including the webhook route. It consumed and parsed the raw request body before the webhook handler could read it. The webhook needs the raw body bytes to verify the HMAC signature.

**Fix**: Added conditional middleware that skips `express.json()` for the webhook path:
```typescript
app.use((req, res, next) => {
  if (req.path === '/api/payments/webhook') {
    return next(); // Skip JSON parsing — webhook needs raw body
  }
  express.json()(req, res, next);
});
```

The webhook route uses `express.raw({ type: 'application/json' })` to capture the body as a Buffer.

---

### Issue 2: tx.execute() Destructuring Bug (RSVP Never Created)

**Symptom**: Payment shows as captured in Razorpay, but no RSVP is created. User sees "Register Now" button even after paying.

**Root Cause**: The code used array destructuring on `tx.execute()`:
```typescript
// ❌ WRONG — tx.execute() returns { rows: [...] }, NOT an array
const [existingRsvp] = await tx.execute(sql`SELECT 1 FROM event_rsvps ...`);
```

With `drizzle-orm/node-postgres`, `tx.execute()` returns a `QueryResult` object `{ rows: [], rowCount, ... }`. Array destructuring on this object extracts the `rows` property (first key), causing a TypeError that crashes the entire transaction and rolls back the RSVP creation.

**Fix**:
```typescript
// ✅ CORRECT — access .rows property directly
const existingRsvpResult = await tx.execute(sql`SELECT 1 FROM event_rsvps ...`);
if (existingRsvpResult.rows.length > 0) { ... }
```

This bug existed in both `handlePaymentCaptured()` and `handleOrderPaid()`.

---

### Issue 3: Reconciliation Service Crash (Private Method + Missing Parameter)

**Symptom**: Payment status polling endpoint crashes silently. Reconciliation never completes.

**Root Cause**: `reconcileSinglePayment` was `private` and required a `result: ReconciliationResult` parameter. But the polling endpoint called it without the result parameter:
```typescript
// Called from payment status endpoint:
await PaymentReconciliationService.reconcileSinglePayment(payment);
// But the method signature required 2 args, and result.updated++ would crash
```

**Fix**: Made the method `public` and the `result` parameter optional:
```typescript
static async reconcileSinglePayment(
  payment: ...,
  result?: ReconciliationResult  // optional now
): Promise<void> {
  ...
  if (result) result.updated++;  // safe access
}
```

---

### Issue 4: RSVP Status Not Detected (Type Mismatch)

**Symptom**: User has paid and RSVP exists, but the button still shows "Register Now" instead of "Registered". On refresh, payment confirmed badge disappears.

**Root Cause**: `getUserRsvpStatus()` used strict equality (`===`) to compare user IDs:
```typescript
// ❌ Fails when rsvp.userId is number and user.id is string (or vice versa)
event.rsvps.find((rsvp) => rsvp.userId === user.id)
```

**Fix**:
```typescript
// ✅ String coercion handles type mismatches
event.rsvps.find((rsvp) => String(rsvp.userId) === String(user.id))
```

---

### Issue 5: False "Payment Confirmed" State on Timeout

**Symptom**: User sees "Payment Confirmed" badge + "Register Now" button simultaneously. On page refresh, both disappear (back to unpaid state).

**Root Cause**: When payment polling times out (10 seconds), the code called `onPaymentSuccess()` which set `hasPaid = true` locally — even though the server hadn't created the RSVP yet. This created a mismatch between client state (paid) and server state (no RSVP).

**Fix**: On timeout, only close the modal and show a "please refresh" message. Don't set `hasPaid = true` until the server confirms via a data refetch:
```typescript
// On timeout: close modal, don't fake success
onClose();
// DON'T call onPaymentSuccess() — let page refresh pick up actual status
```

---

### Issue 6: Razorpay Key Exposed in Logs (Security)

**Symptom**: Production logs contained `✓ Razorpay key loaded: rzp_live_R...` showing partial API key.

**Root Cause**: Debug console.log statements were logging the Razorpay key (truncated) in both client-side (PaymentModal.tsx) and server-side (payment-routes.ts).

**Fix**: Removed all console.log statements that referenced Razorpay keys, secrets, or response bodies. Only essential error messages remain.

---

## Current State (After Fixes)

| Component | Status | Notes |
|-----------|--------|-------|
| Webhook signature verification | ✅ Working | Returns 200 to Razorpay |
| RSVP creation via webhook | ✅ Fixed | tx.execute() destructuring corrected |
| RSVP creation via polling | ✅ Fixed | reconcileSinglePayment now public + safe |
| UI button state | ✅ Fixed | String coercion for userId comparison |
| Timeout handling | ✅ Fixed | No false "paid" state on timeout |
| Capacity management | ✅ Working | Atomic increment with race condition protection |
| Cron reconciliation | ✅ Working | Every 6 hours, checks payments > 10 min old |
| Security (key exposure) | ✅ Fixed | No sensitive data in logs |

---

## Environment Variables Required

```
RAZORPAY_KEY_ID=rzp_live_...        # Razorpay API key
RAZORPAY_KEY_SECRET=...              # Razorpay API secret
RAZORPAY_WEBHOOK_SECRET=...          # Webhook signature verification secret
DATABASE_URL=postgresql://...        # Neon PostgreSQL connection string
```

## Razorpay Dashboard Configuration

- **Webhook URL**: `https://tribbe.in/api/payments/webhook`
- **Webhook Events**: `payment.captured`, `payment.authorized`, `payment.failed`, `order.paid`, `refund.processed`, `refund.failed`, `refund.created`
- **Webhook Active Version**: Must match the secret in `RAZORPAY_WEBHOOK_SECRET`
