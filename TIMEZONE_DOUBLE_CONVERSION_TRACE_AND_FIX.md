# Timezone Double-Conversion Trace and Fix

Date: 2026-03-17

## Issue

Editing an event in production still shifted `datetime` / `endDatetime` by `+5:30`.

## Root Cause Pattern

The bug appears when date values are interpreted with mixed assumptions during this cycle:
1. API fetch returns event datetime.
2. Edit page transforms it for `datetime-local` input.
3. User saves without intent to change time.
4. Backend parser normalizes input.
5. Saved value shifts because one stage interpreted timezone differently.

---

## Full Flow Trace (Before Fix)

### A) Fetch from API
- Edit page fetches `/api/events/:id`.
- `event.datetime` and `event.endDatetime` can be timezone-aware or legacy timezone-less strings.

### B) Transform for input
- Existing parser in edit page handled timezone-aware values correctly.
- For timezone-less values, it could be interpreted with local/browser rules, which is unstable across environments.

### C) Re-submit
- Frontend now sends raw `datetime-local` (already correct per architecture).
- Backend parser treats timezone-less input as IST wall-clock and applies `+05:30` once.
- If frontend display stage had already interpreted values incorrectly, this looked like an additional +5:30 shift after save.

---

## What Was Changed

## 1) Frontend Edit Display Logic Fixed (IST wall-clock output)

File:
- `client/src/pages/edit-event.tsx`

### Changes
- Reworked `parseServerDateTime`:
  - If timezone exists (`Z` / offset), parse as instant.
  - If timezone is missing (legacy), treat as UTC instant (`...Z`) fallback.
- Replaced generic local formatter with IST-specific formatter:
  - `toIstDateTimeInput` using `Intl.DateTimeFormat(..., { timeZone: 'Asia/Kolkata' })`
  - Output format: `YYYY-MM-DDTHH:mm`

### Why
- `datetime-local` should show wall-clock value in IST consistently.
- Avoids browser-local timezone differences.
- Prevents accidental implicit conversions from UTC/local mismatch.

---

## 2) Frontend Submit Logging Added (TEMP)

File:
- `client/src/pages/edit-event.tsx`

Logs added:
- Raw API values when loading edit form.
- Parsed + formatted values used for the input.
- Payload datetime values right before PUT submit.

Log tags:
- `[TZ][Edit] Raw event datetimes from API`
- `[TZ][Edit] Parsed + formatted for datetime-local`
- `[TZ][Edit] Submitting payload`

---

## 3) Backend Parser Logging Added (TEMP)

File:
- `server/routes.ts`

`parseIncomingEventDateTime` now logs:
- source label (`create.datetime`, `update.endDatetime`, etc.)
- input value
- parse branch used
- output ISO value

Log tag:
- `[TZ][Parser]`

Branches logged:
- `date-instance`
- `non-string`
- `zoned-string`
- `timezone-less-ist`
- `fallback`

---

## 4) Backend Save Logging Added (TEMP)

File:
- `server/routes.ts`

Before DB save, logs raw + parsed values:
- Create route (`POST /api/events`) logs raw and parsed datetime fields.
- Update route (`PUT /api/events/:idOrSlug`) logs raw request values and parsed values that will be saved.

Log tags:
- `[TZ][Create] About to save event datetimes`
- `[TZ][Update] About to save event datetimes`

---

## Timezone Contract (Now Enforced)

## Frontend
- Does not apply timezone conversion on submit.
- Displays edit inputs in IST wall-clock format.

## Backend
- Single source of truth for normalization.
- Applies exactly one IST normalization for timezone-less input.
- Does not reapply IST for timezone-aware input.

This satisfies:
- ZERO timezone conversion during frontend submit.
- EXACTLY ONE normalization on backend.

---

## Production Verification Checklist

1. Deploy latest frontend and backend images.
2. Rebuild/restart containers (ensure no stale JS bundle).
3. Open one event and capture logs from browser console and server logs:
- `[TZ][Edit] Raw event datetimes from API`
- `[TZ][Edit] Parsed + formatted for datetime-local`
- `[TZ][Edit] Submitting payload`
- `[TZ][Parser]`
- `[TZ][Update] About to save event datetimes`
4. Save without changing datetime and verify values stay identical.

---

## If Existing DB Rows Are Already Shifted

Use correction script from prior fix notes:
- `scripts/fix-event-time-offset.ts`

Always run preview first, then apply for specific event IDs.

---

## Expected Outcome

- Editing event should no longer increase time by +5:30.
- `datetime` and `endDatetime` remain unchanged when user saves without editing time.
- Any remaining shifted rows can be corrected once via DB script.
