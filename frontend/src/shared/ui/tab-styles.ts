/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "./cx";
import { FOCUS_RING } from "./focus-ring";

/** Tabs look the same whether they switch panels (AppTabs) or routes (link tabs). */
export const TAB_LIST_CLASS = "flex w-full flex-wrap items-center gap-6 border-b border-line";

export const tabItemClass = (active: boolean) =>
  cx(
    "inline-flex cursor-pointer items-center gap-2 border-b-2 px-1 py-3 text-sm font-semibold transition-colors",
    FOCUS_RING,
    active ? "border-accent text-fg" : "border-transparent text-fg-secondary hover:text-fg",
  );

export const tabCountClass = (active: boolean) =>
  cx(
    "min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-medium",
    active ? "bg-accent-subtle text-accent-strong" : "bg-surface-muted text-fg-secondary",
  );
