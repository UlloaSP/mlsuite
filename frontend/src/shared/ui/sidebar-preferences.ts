/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atomWithStorage } from "jotai/utils";

/** The edge a vertical sidebar occupies. */
export type SidebarPosition = "left" | "right";
/** Where navigation lives: a vertical sidebar on either side, or a horizontal bar. */
export type NavigationPosition = SidebarPosition | "top" | "bottom";
/** Fixed spans the viewport edge; floating is an inset panel on the page background. Applies to every position. */
export type SidebarStyle = "fixed" | "floating";

/** Stores one of a fixed set of string choices, ignoring anything else found in storage. */
const choiceStorage = <T extends string>(choices: readonly T[]) => {
  const isChoice = (value: unknown): value is T => choices.includes(value as T);
  return {
    getItem: (key: string, initialValue: T) => {
      const raw = localStorage.getItem(key);
      if (!raw) return initialValue;

      try {
        const value: unknown = JSON.parse(raw);
        return isChoice(value) ? value : initialValue;
      } catch {
        return isChoice(raw) ? raw : initialValue;
      }
    },
    setItem: (key: string, value: T) => {
      localStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: (key: string) => {
      localStorage.removeItem(key);
    },
  };
};

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
