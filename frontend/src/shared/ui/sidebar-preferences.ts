/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createPersistedAtom } from "@/shared/lib/persisted-atom";

/** The edge a vertical sidebar occupies. */
export type SidebarPosition = "left" | "right";
/** Where navigation lives: a vertical sidebar on either side, or a horizontal bar. */
export type NavigationPosition = SidebarPosition | "top" | "bottom";
/** Fixed spans the viewport edge; floating is an inset panel on the page background. Applies to every position. */
export type SidebarStyle = "fixed" | "floating";

const oneOf =
  <T extends string>(choices: readonly T[]) =>
  (value: unknown): value is T =>
    choices.includes(value as T);

export const isSidebarPosition = (position: NavigationPosition): position is SidebarPosition =>
  position === "left" || position === "right";

// Stored under the original key: saved left/right choices stay valid.
export const navigationPositionAtom = createPersistedAtom<NavigationPosition>(
  "ui/sidebar-position",
  "right",
  oneOf<NavigationPosition>(["left", "right", "top", "bottom"]),
);

export const sidebarStyleAtom = createPersistedAtom<SidebarStyle>(
  "ui/sidebar-style",
  "fixed",
  oneOf<SidebarStyle>(["fixed", "floating"]),
);

/** Where the current page's breadcrumb trail is shown, if anywhere. */
export type LocationDisplay =
  | "breadcrumb-top"
  | "breadcrumb-bottom"
  | "rail-left"
  | "rail-right"
  | "off";

export const locationDisplayAtom = createPersistedAtom<LocationDisplay>(
  "ui/location-display",
  "breadcrumb-top",
  oneOf<LocationDisplay>(["breadcrumb-top", "breadcrumb-bottom", "rail-left", "rail-right", "off"]),
);
