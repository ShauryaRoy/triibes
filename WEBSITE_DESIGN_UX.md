# Triibes Website Design & UX Documentation

This document explains the visual design and user experience of all website pages currently routed in the `tribbe` app.

## 1. Product-Wide Design Language

### Visual style
- Modern social-product aesthetic using rounded cards, soft shadows, and glassmorphism surfaces.
- Frequent use of gradient accents (especially violet/indigo) for primary actions and active states.
- Rich background treatment: gradients, themed animated backdrops, and atmospheric overlays.
- Strong contrast hierarchy: bold headings, muted support text, and clear CTA buttons.

### Navigation model
- Desktop: floating top header with logo, route tabs (Events, Groups, Discover), notifications, and profile actions.
- Mobile: fixed bottom navigation with icon + label, active indicator, and quick route switching.
- Shared navigation keeps users oriented when moving between event, group, and profile experiences.

### UX patterns used across pages
- Skeleton or spinner loading states to avoid blank screens.
- Empty states with a direct next action (usually create/join CTA).
- Card-based scanning for events/groups.
- Filter pills and quick controls for discoverability.
- Toast feedback for success/error actions.
- Modal dialogs for focused tasks (login, invite, payment, settings).

### Responsive behavior
- Most pages are mobile-first and switch to split layouts on large screens.
- Hero/decorative sections simplify on mobile while preserving key calls to action.
- Horizontal scrollers and pill controls are adapted for touch.

## 2. Routed Pages (All Current Website Pages)

## `/` Root Route
Behavior depends on authentication state:
- Logged out users see the landing page.
- Logged in users see the home/events feed page.

### Landing Page (`landing.tsx`)
Purpose:
- Introduce product value and drive sign-in.

Design:
- Storytelling-style marketing layout with floating cards and micro-animations.
- Fixed glassmorphism navbar and section anchors for smooth scrolling.
- Comparison blocks (old chaos vs Triibes clarity) to communicate value quickly.

UX:
- Main CTA opens login dialog.
- Visual narrative helps first-time users understand problem/solution before signup.

### Home Page (`home.tsx`)
Purpose:
- Personalized event home for signed-in users.

Design:
- Warm welcome hero with personalized greeting.
- Event content presented as poster-first cards with subtle depth and hover lift.
- Soft panel container for “Your Events” with filter tabs and count badges.

UX:
- Quick filtering (all/hosting/attending/past).
- Horizontal event browsing with left/right controls.
- Empty state clearly guides user to create first event.

## `/discover` Discover Events (`discover.tsx`)
Purpose:
- Public event exploration and discovery.

Design:
- Matching hero style to home/groups for visual consistency.
- Search + category pills + optional advanced filters grouped in one clean control panel.
- Dense but readable event poster grid for high scan speed.

UX:
- Search and sort support exploratory behavior.
- Category chips show live counts to reduce guesswork.
- “Host an Event” CTA keeps creator path visible.

## `/groups` Groups Index (`communities.tsx`)
Purpose:
- Hub for owned groups, joined groups, and discoverable public groups.

Design:
- Hero section mirrors Events/Discover for brand continuity.
- Distinct sections for owned, joined, and discoverable groups.
- Group cards emphasize logo, member count, and state.

UX:
- Join-by-code flow is surfaced as a first-class action.
- Search/category/sort help users find relevant communities.
- Separate owned vs joined organization reduces cognitive load for power users.

## `/groups/create` Create Group (`create-community.tsx`)
Purpose:
- Structured group setup flow.

Design:
- Focused single-column form with dark themed backdrop.
- Clear segmentation: images, basic information, privacy, scope/category.
- Validation messaging and upload confirmations are visible and immediate.

UX:
- Auto-generates slug from name and validates uniqueness.
- Guides users through required brand assets (cover/logo).
- Success path directly navigates to newly created group.

## `/groups/:id` Group Details (`community-details.tsx`)
Purpose:
- Main community page for members and visitors.

Design:
- Group identity header (cover, avatar, role/membership cues).
- Tabbed content model for events, members, announcements, etc.
- Rich social/community surfaces with badges and role indicators.

UX:
- Handles public/private group access patterns.
- Join/leave and membership role actions are contextual.
- Includes event visibility in group context to keep engagement centered.

## `/groups/:id/manage` Group Management (`community-manage.tsx`)
Purpose:
- Admin/owner control center for group operations.

Design:
- Management dashboard with tabbed operations (members, settings, discover request, newsletters).
- Utility-first visuals: readable cards, toggles, selects, and action buttons.

UX:
- Member moderation flows (role updates, remove users) are explicit.
- Discover listing request has status-driven UX (none/pending/approved/rejected).
- Settings and communication tools centralize operational tasks.

## `/groups/:id/dashboard` Group Dashboard (`group-dashboard.tsx`)
Purpose:
- Analytics and health view for community leaders.

Design:
- Executive-summary style cards and metrics framing.
- Insight-heavy presentation with trend and priority widgets.
- Action-oriented layout surfaces “what to do next”.

UX:
- Prioritized alerts reduce time to intervention.
- Uses data-backed next actions (invite members, review requests, create event).
- Supports owner/host operational decision-making.

## `/profile` Profile (`profile.tsx`)
Purpose:
- Personal profile, stats, hosted/attended event context, and account editing.

Design:
- Profile header with avatar identity and concise metadata.
- Structured edit mode with form controls and clear save/cancel actions.
- Stats and activity sections for personal event footprint.

UX:
- Inline edit transition keeps user in context.
- Fetches profile, stats, events, groups in parallel for richer overview.
- Includes pathways to related actions like settings and communities.

## `/create-event` Create Event (`create-event.tsx`)
Purpose:
- Full event creation workflow.

Design:
- Theme-driven immersive canvas (background adapts to selected theme).
- Editorial, creator-focused layout with large editable title and poster controls.
- Uses collapsible/sectioned form logic to reduce overwhelm.

UX:
- Strong validation for schedule consistency (future date, end after start).
- Supports advanced hosting options: RSVP mode, entry mode, guest visibility, ticketing, payout details, extra info.
- Creation success immediately routes to the event details page.

## `/edit-event/:id` Edit Event (`edit-event.tsx`)
Purpose:
- Controlled update flow for existing events.

Design:
- Mirrors create-event visual language for consistency and familiarity.
- Keeps immutable fields constrained while exposing editable operational details.

UX:
- Host-only access enforcement.
- Preserves existing values robustly (including poster/theme/settings).
- Handles timezone-safe datetime transformation for reliable edits.

## `/events/:id` Event Details (`event-details.tsx`)
Purpose:
- Core event experience for attendees and hosts.

Design:
- Multi-section event hub with rich interaction modules (guest list, polls, gallery, poster customization, expenses).
- CTA layering for RSVP/register, invite codes, sharing, and payment.
- Uses tabs and modular cards to keep complex content navigable.

UX:
- Handles private/public access and invite-gated flows.
- Includes payment-aware registration behavior for paid events.
- Supports host and attendee actions without context switching.
- Includes recovery logic for post-login and pending invite/payment states.

## `/events/:id/dashboard` Event Dashboard (`event-dashboard.tsx`)
Purpose:
- Host control panel for a specific event.

Design:
- Data-dense dashboard using metrics cards and charts.
- Section-based navigation for overview, settings, applications, and questions.

UX:
- Centralizes event operations: RSVP settings, entry mode, form questions, application review, reminders, discover request.
- Visualizes attendance and trend data for quick decision support.
- Strong feedback loops via toasts and query refresh after updates.

## `/invite/:code` Group Invite (`invite.tsx`)
Purpose:
- Lightweight invite acceptance flow for group membership.

Design:
- Focused single-card conversion UI on dark background.
- State-based visuals (valid/success/error) with clear iconography.

UX:
- Validates invite code up front.
- If unauthenticated, prompts login and preserves redirect intent.
- On success, redirects user directly into target group.

## `/event-invite/:code` Event Invite (`event-invite.tsx`)
Purpose:
- Lightweight invite acceptance flow for event access.

Design:
- Similar focused invite pattern as group invites for consistency.
- Adds contextual event metadata (date/time/location/host).

UX:
- Validates invite before commitment.
- Handles auth gate with redirect memory.
- Unlocks event access and routes user to event details.

## Fallback Route

### 404 Not Found (`not-found.tsx`)
Purpose:
- Safe fallback for unknown routes.

Design:
- Minimal centered card with clear error affordance.

UX:
- Short and straightforward; indicates route mismatch.

## 3. UX Strengths Summary

- Consistent visual grammar across events, groups, and profile areas.
- Clear separation between browse flows (discover) and manage flows (dashboards).
- Strong state handling for auth, loading, errors, and action outcomes.
- Mobile navigation is practical and persistent.
- Invites and private-access patterns are thoughtfully integrated.

## 4. Potential UX Improvement Opportunities

- Add breadcrumbs or persistent context chips on deep pages (dashboards/manage screens).
- Standardize empty-state illustration and copy tone across all modules.
- Add explicit keyboard accessibility hints for highly interactive dashboards.
- Consider consolidating overlapping dashboard controls (group vs event) for faster learning.
