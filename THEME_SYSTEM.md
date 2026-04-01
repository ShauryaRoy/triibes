# Theme System Documentation

This document explains the full theme system used in the app: data model, theme selector behavior, rendering pipeline, animations, display mode behavior, and common failure/debug paths.

## 1. High-Level Architecture

The theme system has 5 major parts:

1. Theme catalog (source of truth)
2. Theme selector UI (user picks category + style)
3. Theme background renderer (visual output)
4. Display mode resolver (light/dark auto tuning)
5. Page integration (selected theme passed into background)

Main files:

- client/src/components/theme-catalog.ts
- client/src/components/theme-selector.tsx
- client/src/components/ThemeBackground.tsx
- client/src/hooks/useDisplayMode.ts
- client/src/index.css
- client/src/pages/create-event.tsx

## 2. Theme Data Model

File: client/src/components/theme-catalog.ts

### 2.1 Core Types

- ThemeCategoryId
  - minimal | quantum | warp | emoji | confetti | others
- ThemeRenderKind
  - minimal | quantum | warp | emoji | confetti | legacy
- ThemeOption
  - id, name, description, category, kind, accentColor
  - optional rendering fields:
    - solidColor (minimal)
    - quantumGradient (quantum)
    - warpTint (warp)
    - emoji + bgColor (emoji)
    - confettiShape + confettiPalette + bgColor (confetti)
    - gradient (legacy)

### 2.2 Theme Groups

Catalog exports grouped arrays:

- minimalThemes
- quantumThemes
- warpThemes
- emojiThemes
- confettiThemes
- otherThemes

And combines all of them using:

- themeCategories
- allThemes

### 2.3 Lookup and Resolution

- getThemeById(themeId)
  - Direct lookup in allThemes
- resolveThemeById(themeId)
  - Direct theme first
  - If not found, attempts custom emoji theme parsing
  - If not found, attempts custom confetti theme parsing
  - Returns undefined when no valid theme can be resolved

Important: rendering depends on resolveThemeById returning the expected kind.
If id is wrong or missing, fallback logic can produce a non-quantum theme.

## 3. Theme Selection UI

File: client/src/components/theme-selector.tsx

### 3.1 UI Categories

Selector uses UI categories:

- minimal
- quantum
- warp
- emoji

Each category maps to explicit theme ids in uiCategoryThemeMap.

### 3.2 Theme Choice Flow

When user clicks a category icon:

- activeCategory is set
- random theme for that category is picked
- onThemeChange(themeId) is called

When user picks a specific color/style swatch:

- onThemeChange(themeId) is called directly

### 3.3 Important Mapping Rules

- Category inference for existing selection uses getUiCategoryForTheme(themeId)
- Selector preview for quantum uses theme.kind === quantum and theme.quantumGradient

If selector preview looks quantum but page background does not, issue is usually in background render/stacking, not in selector.

## 4. Background Rendering Engine

File: client/src/components/ThemeBackground.tsx

ThemeBackground receives themeId and resolves it:

- resolvedTheme = resolveThemeById(themeId) or fallback random minimal

Then renders by kind:

- minimal: static solidColor
- quantum: multi-layer animated radial gradients
- warp: warp effect + tint overlays
- emoji: solid bg + floating emoji field
- confetti: solid bg + confetti burst field
- legacy: original legacy background effects

Content is rendered above backgrounds using:

- .ui-layer wrapper with:
  - position: relative
  - z-index: 10

## 5. Quantum Rendering Details

Files:

- client/src/components/ThemeBackground.tsx
- client/src/index.css

### 5.1 Quantum Layers

Quantum uses 3 animated blurred color blobs:

- quantum-blob blob1
- quantum-blob blob2
- quantum-blob blob3

Blob rendering rules:

- position: absolute
- border-radius: 50%
- filter: blur(80px)
- opacity: 0.75
- pointer-events: none

Container rules:

- full-screen fixed quantum container
- dark base background
- overflow: hidden
- transition: background 2s ease

### 5.2 Quantum Variant Cycle

Quantum now cycles through 7 predefined aurora/blob variants in ThemeBackground.tsx.

Each variant defines:

- base (dark background)
- blobs[0..2] (blob colors)

Cycle behavior:

- variant index stored in component state
- increments via setInterval every 9000ms while quantum is active
- wraps around after variant 7

### 5.3 Motion

Defined in client/src/index.css:

- @keyframes quantum-blob-1 (6s)
- @keyframes quantum-blob-2 (8s)
- @keyframes quantum-blob-3 (7s)

Applied on:

- .quantum-bg .blob1
- .quantum-bg .blob2
- .quantum-bg .blob3

All blob animations use:

- translate + scale
- ease-in-out
- infinite
- alternate

### 5.4 Blend + Blur

- mix-blend-mode: screen
- blur is controlled in CSS on .quantum-bg .quantum-blob
  - filter: blur(80px)
- blob opacity baseline
  - opacity: 0.75
- quantum uses a subtle internal dark tone overlay for readability

### 5.5 Quantum Debug Mode

For local debug tuning, quantum supports an opt-in debug class:

- localStorage key: quantum-debug
  - set to 1 to enable debug mode
- When enabled:
  - .quantum-bg.quantum-debug .quantum-blob uses:
    - opacity: 1
    - filter: blur(0px)
    - mix-blend-mode: normal

This is useful to verify that blobs are present before blur/blend tuning.

### 5.6 Blob Layout Contract (Important)

- Blob 1:
  - top: -100px
  - left: -100px
  - size: 400x400
- Blob 2:
  - top: 50px
  - right: -80px
  - size: 350x350
- Blob 3:
  - bottom: -80px
  - left: 40%
  - size: 300x300

This layout is intentional to keep movement organic and avoid center-clumping.

## 6. Display Mode Logic

File: client/src/hooks/useDisplayMode.ts

### 6.1 Purpose

Determines whether display should be treated as dark or light for selected theme:

- returns display-dark or display-light or null

### 6.2 Scope

Display mode logic only applies to:

- quantum
- emoji

### 6.3 Auto Mode

When displayMode is auto:

- If source is hex -> parse luminance
- Else if source is gradient -> parse first hex from gradient
- Uses luminance threshold to choose display-dark/display-light

### 6.4 Overlay Layer

File: client/src/components/ThemeBackground.tsx

- A global overlay element exists:
  - class background-overlay + display mode class
- For quantum, global overlay is not rendered at all.
  - No global display-light/display-dark class is applied for quantum.
  - Quantum uses only its internal tone overlay layer.

## 7. CSS Layering Rules That Matter

File: client/src/index.css

Quantum container:

- .quantum-bg
  - position: fixed
  - inset: 0
  - z-index: 0

Foreground content container:

- .ui-layer
  - position: relative
  - z-index: 10

This is critical. Negative z-index can push quantum behind other layers and make it appear as flat/minimal color.

Important implementation note:

- Do not add absolute inset utility classes on the quantum container in JSX.
  - The fixed positioning should come from .quantum-bg in CSS.

## 8. Create Event Integration

File: client/src/pages/create-event.tsx

### 8.1 Initial Theme

Current initialization uses random minimal default:

- selectedTheme state initialized via getRandomMinimalThemeId()

### 8.2 Theme Selector Binding

ThemeSelector updates selectedTheme in local state:

- onThemeChange(themeId)
  - setSelectedTheme(themeId)
  - setValue("themeId", themeId)

### 8.3 Background Binding

Page root wraps UI with:

- ThemeBackground themeId={selectedTheme}

So the page immediately reflects selected theme, independent of form submission.

### 8.4 Overlay Constraint

Create Event page should not render a full-screen parent dimmer over ThemeBackground.

- Removed full-screen black overlay layer from create-event root.
- Reason: parent full-screen overlays can flatten quantum gradients and hide motion contrast.

## 9. Why Quantum Can Look Like Minimal (Failure Modes)

Most common causes:

1. Theme id not resolving to quantum
   - resolveThemeById returns undefined or a non-quantum theme
2. Quantum layer is rendered behind another background due to z-index
3. Global overlay washes out gradients too aggressively
4. A page was reverted/overwritten and is still defaulting to minimal theme id
5. CSS class name mismatch between component and stylesheet
6. Page-level fullscreen dim overlays (for example absolute inset-0 bg-black/xx) flatten blobs
7. Quantum container accidentally forced to absolute in JSX, overriding fixed behavior

## 10. Debug Checklist (Fast)

Use this order:

1. Confirm selected id in component state starts with quantum-
2. Confirm resolveThemeById(selectedTheme)?.kind === quantum
3. Confirm ThemeBackground quantum block is rendered
4. Confirm .quantum-bg has z-index 0 (not negative)
5. Confirm .ui-layer is relative with z-index 10
6. Confirm global display overlay is not flattening quantum
7. Confirm there is no full-screen parent overlay above ThemeBackground
8. Confirm quantum-float keyframes are active (no override disabling animation)
9. Confirm no file overwrite reverted create-event or ThemeBackground

## 11. Current Known Conventions

- Minimal themes are used as safe default fallback.
- Quantum should always be visibly animated and multi-layered.
- Selector preview and page background should both reflect the same theme id.
- Quantum global overlay is disabled by design.
- Quantum visual tuning baseline:
  - blur(80px)
  - blob opacity 0.75
  - mix-blend-mode: screen
- If mismatch happens, inspect resolution + stacking first.

## 12. Recommended Future Improvements

1. Add a small dev-only theme debug badge (id + kind) on screen.
2. Add unit tests for resolveThemeById with all built-in ids.
3. Add visual regression snapshots for one theme in each kind.
4. Centralize z-index tokens for background layers to avoid stacking regressions.
5. Persist selected display mode in user settings and apply globally.

## 13. Quick Reference

- Theme source: client/src/components/theme-catalog.ts
- Selector UI: client/src/components/theme-selector.tsx
- Background renderer: client/src/components/ThemeBackground.tsx
- Display mode resolver: client/src/hooks/useDisplayMode.ts
- Theme animations/styles: client/src/index.css
- Create Event integration: client/src/pages/create-event.tsx
- Quantum debug toggle: localStorage quantum-debug = 1
