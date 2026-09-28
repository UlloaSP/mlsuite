/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atomWithStorage } from "jotai/utils";
import { validatedStorage } from "@/shared/lib/validated-storage";

/** The edge a vertical sidebar occupies. */
export type SidebarPosition = "left" | "right";
/** Where navigation lives: a vertical sidebar on either side, or a horizontal bar. */
export type NavigationPosition = SidebarPosition | "top" | "bottom";
/** Fixed spans the viewport edge; floating is an inset panel on the page background. Applies to every position. */
export type SidebarStyle = "fixed" | "floating";

const choiceStorage = <T extends string>(choices: readonly T[]) =>
  validatedStorage((value: unknown): value is T => choices.includes(value as T));

export const isSidebarPosition = (position: NavigationPosition): position is SidebarPosition =>
  position === "left" || position === "right";

// Stored under the original key: saved left/right choices stay valid.
export const navigationPositionAtom = atomWithStorage<NavigationPosition>(
  "ui/sidebar-position",
  "right",
  choiceStorage<NavigationPosition>(["left", "right", "top", "bottom"]),
  { getOnInit: true },
);

export const sidebarStyleAtom = atomWithStorage<SidebarStyle>(
  "ui/sidebar-style",
  "fixed",
  choiceStorage<SidebarStyle>(["fixed", "floating"]),
  { getOnInit: true },
);

/** Where the current page's breadcrumb trail is shown, if anywhere. */
export type LocationDisplay =
  | "breadcrumb-top"
  | "breadcrumb-bottom"
  | "rail-left"
  | "rail-right"
  | "off";

export const locationDisplayAtom = atomWithStorage<LocationDisplay>(
  "ui/location-display",
  "breadcrumb-top",
  choiceStorage<LocationDisplay>([
    "breadcrumb-top",
    "breadcrumb-bottom",
    "rail-left",
    "rail-right",
    "off",
  ]),
  { getOnInit: true },
);
