# End Time +5:30 Production Fix

Date: 2026-03-17

## Problem

After creating an event, opening Edit page showed `endDatetime` increased by `+5:30` (IST offset).

This is a timezone normalization issue between:
- `datetime-local` browser inputs (no timezone)
- API payload conversions
- server/date parsing behavior
- historical DB rows that may have been saved with the wrong timezone assumption

---

## What Was Changed

## 1) Frontend: removed client-side ISO conversion

Files changed:
- `client/src/pages/create-event.tsx`
- `client/src/pages/edit-event.tsx`

### Before
Frontend converted form values with:
- `new Date(data.datetime).toISOString()`
- `new Date(data.endDatetime).toISOString()`

### Now
Frontend sends raw `datetime-local` values as-is:
- `datetime: data.datetime`
- `endDatetime: data.endDatetime`

### Why
`datetime-local` values are wall-clock values with no timezone. Converting in browser can introduce timezone assumptions before backend sees the data.

Now backend is the only place that normalizes timezone.

---

## 2) Backend: centralized parsing already in place

File:
- `server/routes.ts`

A shared parser (`parseIncomingEventDateTime`) handles incoming values consistently:
- If value has timezone (`Z` or `+hh:mm`): parse as absolute instant.
- If value has no timezone: treat as IST wall-clock (`+05:30`) before saving.

Applied in both routes:
- `POST /api/events`
- `PUT /api/events/:idOrSlug`

This ensures create and edit follow the same timezone rules.

---

## 3) DB correction script for already-shifted records

New script:
- `scripts/fix-event-time-offset.ts`

This script can subtract a fixed offset (default `330` minutes) from:
- `events.datetime`
- `events.end_datetime`

Use this for historical records already saved incorrectly.

---

## How To Use the DB Fix Script

From repo root (`tribbe`):

## Preview specific events (safe)
```bash
npx tsx scripts/fix-event-time-offset.ts --eventIds=123,124
```

## Apply specific events
```bash
npx tsx scripts/fix-event-time-offset.ts --eventIds=123,124 --apply
```

## Preview all events
```bash
npx tsx scripts/fix-event-time-offset.ts --all
```

## Apply all events (dangerous, do only if all records are shifted)
```bash
npx tsx scripts/fix-event-time-offset.ts --all --apply
```

Optional custom offset:
```bash
npx tsx scripts/fix-event-time-offset.ts --eventIds=123 --minutes=330 --apply
```

---

## Recommended Rollout (Production)

1. Deploy backend + frontend changes.
2. Rebuild/restart containers/services.
3. Create one new test event and verify edit page start/end times are unchanged.
4. If old events are still shifted, run script for specific affected event IDs first.
5. Only run `--all --apply` after confirming all rows have same offset issue.

---

## Why This Fix Is Reliable

- Single timezone authority: backend parser.
- No browser-side timezone conversion before API call.
- One-time DB script available for legacy bad rows.

This combination addresses both:
- future correctness (new/edited events)
- historical correction (already-shifted records)

---

## Notes

- The DB script is intentionally dry-run by default.
- Always preview first.
- Keep a DB backup/snapshot before bulk applying fixes.
