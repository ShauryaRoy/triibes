# Event Settings Ownership Refactor

Date: 2026-03-17

## Overview

This refactor enforces strict ownership boundaries between:
- `Edit Event` form fields
- `Manage Event Popup` fields

The objective is to eliminate state conflicts and prevent accidental overwrites of popup-managed settings.

Popup-managed fields:
- `guestListVisibility`
- `isClosed`
- `rsvpMode`
- `showGuestCount`

These fields are now treated as popup-owned settings and are not allowed to be updated by normal edit-form submissions.

---

## Why This Refactor Was Needed

Previously, event updates could come from multiple UI paths and share overlapping backend update routes. That can lead to:
- stale state race conditions
- one UI path unintentionally overwriting another
- confusing "it reset to default" behavior

The new model creates a single source of truth per field owner:
- Edit form owns content/editable core event fields.
- Manage popup owns behavior/privacy/attendance display settings listed above.
- Backend enforces the boundary, even if frontend payloads are incorrect.

---

## Files Changed

### 1) `client/src/components/manage-event-popup.tsx`

#### Key changes

1. `Save Changes` API payload is now strict and minimal
- For existing events (`eventId` available), popup sends only:
  - `guestListVisibility`
  - `rsvpMode`
  - `isClosed`
  - `showGuestCount`

2. Removed non-owned field from popup save payload
- `isPublic` is no longer sent from popup save.

3. Removed parent-coupled immediate syncing
- The RSVP mode buttons no longer call `onUpdate` on every click.
- This prevents parent edit page state from becoming an implicit owner.

4. `onUpdate` callback is now limited to pre-create/local mode
- `onUpdate` is called only when event has not been persisted yet (`no valid eventId`).
- For persisted events, popup writes directly to API and invalidates queries.

5. Explicit cache refresh after popup save
- Invalidate:
  - `/api/events/${eventId}`
  - `/api/events/${eventSlug}` (when available)
- Ensures UI reflects server-confirmed values immediately.

#### Result

For persisted events, popup settings are server-owned and refreshed from server state, not parent form state.

---

### 2) `server/routes.ts` (`PUT /api/events/:idOrSlug`)

#### Key changes

1. Added popup-only update branch at top of update handler

The route now detects when request body contains only popup-owned keys:
- `guestListVisibility`
- `isClosed`
- `rsvpMode`
- `showGuestCount`

If so, it enters a dedicated popup update path and updates only these fields.

2. Added strict validation for popup-only updates

- `guestListVisibility` must be one of:
  - `host-only`
  - `attendees-only`
  - `everyone`
- `rsvpMode` must be one of:
  - `rsvp`
  - `register`
- `isClosed` and `showGuestCount` are normalized to booleans.

3. Added hard stripping in normal edit update path

In the non-popup (general edit) path, backend explicitly deletes popup-owned fields from payload:
- `guestListVisibility`
- `isClosed`
- `rsvpMode`
- `showGuestCount`

Even if frontend mistakenly sends these fields, they cannot be persisted through edit payload.

#### Result

Backend is final authority for ownership boundaries. Popup-owned settings cannot be overwritten by standard edit submissions.

---

### 3) `client/src/pages/edit-event.tsx` (ownership confirmation)

#### Current behavior

The edit form submits core event content fields only, such as:
- `title`
- `eventType`
- `datetime`
- `endDatetime`
- `location`
- `mapLink`
- `description`
- `maxGuests`
- `themeId`
- `posterData`
- `settings.extraInfo`

It does not include popup-owned fields in form schema or submission payload.

#### Result

Edit form remains isolated from popup-owned settings by design.

---

## New Data Flow (Post-Refactor)

### A) Edit Form Save Flow

1. User updates normal event fields in Edit page.
2. Frontend sends PUT payload with edit-owned fields.
3. Backend sanitizes payload and strips popup-owned fields if present.
4. Backend updates event.
5. Popup settings remain unchanged.

### B) Manage Popup Save Flow

1. User updates popup settings.
2. Popup sends PUT payload with only popup-owned keys.
3. Backend detects popup-only payload and enters dedicated validated branch.
4. Backend updates only popup-owned fields.
5. Frontend invalidates event queries and re-renders with server values.

---

## Ownership Rules (Single Source of Truth)

### Edit Form Owns
- event content and structure fields (title, description, datetime, etc.)

### Popup Owns
- `guestListVisibility`
- `isClosed`
- `rsvpMode`
- `showGuestCount`

### Backend Enforcement
- Popup-only branch accepts only popup-owned payloads with validation.
- Normal edit path strips popup-owned fields defensively.

This is strict separation without shared ownership.

---

## Integrity Guarantees Achieved

1. Popup changes persist immediately via direct API + cache invalidation.
2. Edit form cannot overwrite popup settings.
3. Backend prevents overwrite even if frontend sends unexpected payload.
4. No shared-state sync dependency between edit page and popup for persisted events.
5. Reduced stale state and cross-path conflicts.

---

## API Behavior Summary

Route: `PUT /api/events/:idOrSlug`

### Mode 1: Popup-only update
Request body contains only subset of:
- `guestListVisibility`
- `isClosed`
- `rsvpMode`
- `showGuestCount`

Behavior:
- validate enum/boolean values
- update only popup-owned fields
- return updated event

### Mode 2: General edit update
Request body contains regular editable fields.

Behavior:
- run immutable guards
- strip immutable + popup-owned fields
- parse/coerce dates
- merge settings safely
- update allowed fields only

---

## Practical Testing Checklist

1. Open Edit Event page, change title/description/time, save.
- Confirm popup settings remain unchanged.

2. Open Manage Popup, change RSVP mode / guest visibility / show count / close event, save.
- Confirm values persist after refresh.

3. Save edit form immediately after popup save.
- Confirm popup settings are still preserved.

4. Attempt manual API call to edit route with mixed payload including popup fields.
- Confirm popup fields are ignored in general edit path.

5. Attempt popup-only payload with invalid enum values.
- Confirm backend rejects with 400.

---

## Notes

- This refactor intentionally avoids introducing shared synchronization logic between popup and edit form.
- Separation is enforced by both frontend intent and backend policy.
- Backend remains the authoritative guardrail for data integrity.
