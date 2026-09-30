/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

// Shared look of the organization switcher and the account menu, the two
// dropdowns that bracket the sidebar.

export const sidebarMenuTrigger = (collapsed: boolean) =>
  cx("rounded-xl text-fg", collapsed ? "mx-auto size-9 min-h-9 p-0" : "min-h-13 px-2.5 py-2");

export const SIDEBAR_MENU_TILE = "grid size-9 shrink-0 place-items-center rounded-xl";

export const sidebarMenuChevron = (collapsed: boolean) =>
  cx(
    "shrink-0 text-fg-muted transition-[opacity,transform] duration-200",
    collapsed ? "w-0 scale-90 opacity-0" : "opacity-100 delay-150",
  );

export const sidebarMenuContent = (collapsed: boolean) =>
  cx(
    "z-(--z-popover) flex max-h-[var(--radix-dropdown-menu-content-available-height)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden rounded-menu border border-line bg-surface p-2 text-fg shadow-hover",
    collapsed ? "w-64" : "w-[var(--radix-dropdown-menu-trigger-width)]",
  );

export const SIDEBAR_MENU_LABEL =
  "px-3 pb-1 pt-1.5 text-2xs font-semibold uppercase tracking-[0.14em] text-fg-muted";

export const SIDEBAR_MENU_SEPARATOR = "my-2 h-px shrink-0 bg-line";

export const SIDEBAR_MENU_ITEM = cx(
  "flex cursor-pointer items-center gap-2.5 rounded-control px-3 text-sm outline-none hover:bg-surface-hover focus:bg-surface-hover focus-visible:ring-inset",
  FOCUS_RING,
);
