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

- `frontend/src/shared/ui/tokens.css` is the single token source and replaces Tailwind's default palette, radius, and shadow scales. Themes in `theme-presets.css` and custom themes only set `--theme-*` inputs; every token derives from them.
- Style with token utilities (`bg-surface`, `text-fg-muted`, `border-line`, `bg-accent`, `text-on-accent`), never hex values, Tailwind palette colors, or `[var(--…)]` wrappers.
- Color roles: page, surface (`subtle`, `muted`, `hover`, `selected`, `raised`, `inverse`), `overlay`, `fg` (`secondary`, `muted`, `disabled`, `inverse`), `line` (`strong`), accent (`hover`, `strong`, `subtle`, `border`, `on-accent`), `focus`, `chart-1…6`, and `code` surfaces for logs and terminals.
- Status roles `success`, `warning`, `danger`, and `info` each provide a solid color, `-fg`, `-subtle`, and `-border`. Pair them with text or icons; color is never the only signal.
- Scales: text `3xs`, `2xs`, then Tailwind's `xs` upward; radius `sm` to `3xl`; shadows `card`, `hover`, and `overlay`; motion `--duration-fast|base|slow` with `--ease-emphasized`; fixed layers `z-(--z-drawer|overlay|modal|popover)`.
- Built-in themes (MLSuite, Airbnb, Grove, Ocean, Ember, Iris, and the community palettes Graphite, Nord, Catppuccin, Rosé Pine, Tokyo Night, Gruvbox, and Solarized) and custom themes support light and dark modes.
- Fonts are presets in `frontend/src/shared/ui/font-catalog.ts`, like themes. Manrope and DM Mono are the defaults; Inter, Geist, IBM Plex Sans, Source Sans 3, Figtree, DM Sans, Atkinson Hyperlegible, and the system stack are the interface alternatives, and JetBrains Mono, Geist Mono, IBM Plex Mono, Fira Code, Source Code Pro, and the system stack the monospace ones. One stylesheet in `index.html` declares every family; browsers only download the family in use. Style text with `font-sans`, `font-mono`, and `text-code`.
- `frontend/test/design-tokens.test.ts` rejects palette and hex classes and undefined color tokens. Add a role to `tokens.css` instead of an exception.
- Treat tables, code, schemas, logs, and reports as first-class content surfaces.

## Layout

- Persistent navigation owns global and section navigation. Do not repeat it as local tabs.
- Users choose where navigation lives (left or right sidebar, top or bottom bar) and whether it is fixed or floating. Pages must not assume a sidebar: size against their container, and when a viewport-based height is unavoidable subtract `--app-nav-block`, the space a bar takes.
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
