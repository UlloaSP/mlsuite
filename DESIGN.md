# MLSuite design

MLSuite is a technical workspace for managing models, schemas, predictions, reviews, and infrastructure. The interface should make dense information calm, traceable, and easy to act on.

This document records durable design decisions. CSS tokens and shared UI components are the source of truth for exact values.

## Principles

### Data first

Names, versions, status, ownership, and next actions matter more than decoration. Keep primary data visible and move secondary actions into predictable overflow menus.

### Clear hierarchy

Each screen needs one obvious purpose, one primary heading, and a small number of primary actions. Tabs own their section labels; cards and panels should not repeat them.

### Flat by default

Use spacing, typography, borders, and restrained surface changes before elevation. Avoid nested grey panels, decorative wrappers, and shadows that compete with content.

### Honest states

Loading, empty, denied, unavailable, partial, failed, and completed states must look different and say what happened. UI claims come from fetched state.

### Stable interactions

Do not unmount stateful editors, forms, or report runtimes for cosmetic changes. Preserve user input across theme changes, tabs, and recoverable failures.

## Visual system

- Use semantic theme tokens from `frontend/src/shared/ui/theme-presets.css`; never hardcode a preset color in a feature.
- MLSuite, Airbnb, Grove, Ocean, Ember, Iris, and custom themes support light and dark modes.
- Product identity and success, warning, danger, focus, and selection roles remain semantic across themes.
- Manrope is the default interface font. IBM Plex Sans, Source Sans 3, and the system stack are supported alternatives.
- Use the shared radius, typography, spacing, shadow, and motion tokens instead of feature-local scales.
- Treat tables, code, schemas, logs, and reports as first-class content surfaces.

## Layout

- Persistent navigation owns global and section navigation. Do not repeat it as local tabs.
- Keep page headers separate from centered or width-constrained content.
- Catalogs use consistent toolbar, list, empty, loading, error, pagination, and overflow-action placement.
- Dense resources use full-width rows or cards. Tiles are for genuinely scannable, low-density content.
- Detail pages expose durable, linkable sections. Use dialogs for bounded actions, not complete workspaces.
- Every layout must remain usable on mobile and tablet; do not solve desktop density by blocking smaller viewports.

## Components

- Shared visual primitives, variants, tokens, and interaction states belong in `frontend/src/shared/ui`.
- Feature components compose those primitives and own domain behavior.
- Use native controls and semantics where possible.
- Keep primary surfaces clickable without nesting interactive controls.
- Put destructive actions behind explicit confirmation and explain blocked actions.
- Show labels users recognize; internal ids may support them but should not replace them.

## Motion

- Motion communicates navigation, hierarchy, or state change.
- Avoid continuously repainting effects and decorative animation.
- Respect reduced-motion preferences.
- Theme and route transitions must preserve runtime state and avoid flashes.

## Accessibility

- Keyboard access, visible focus, semantic controls, labels, contrast, and touch targets are baseline requirements.
- Color is never the only status signal.
- Popup content must remain inside the active modal or top layer.
- Scroll containers need visible reachability without clipped focus rings or controls.

## Avoid

- Invented data, fake metrics, inactive controls, and optimistic copy unsupported by the backend.
- One-off colors, shadows, spacing scales, or components when a shared primitive exists.
- Duplicate headings, nested decorative frames, and panels used only to fill space.
- Search or filters whose data source does not match what users see.
- Architecture or design exceptions added to bypass an inconvenient boundary.

## Review

For requested visual work, check the complete affected surface at relevant widths, themes, keyboard states, and reduced motion. Compare equivalent catalogs and workflows so shared behavior stays shared.
