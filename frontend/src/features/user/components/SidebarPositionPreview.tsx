/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SidebarPosition } from "@/shared/ui/sidebar-position";

const SIDEBAR_PREVIEW = (
  <span className="flex w-10 shrink-0 flex-col gap-2 bg-surface-muted p-2">
    <span className="size-4 rounded-md bg-accent" />
    <span className="mt-2 h-1.5 rounded-full bg-line-strong" />
    <span className="h-1.5 rounded-full bg-line-strong" />
    <span className="h-1.5 rounded-full bg-line-strong" />
  </span>
);

export function SidebarPositionPreview({ position }: { position: SidebarPosition }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-24 w-full max-w-56 overflow-hidden rounded-xl border border-line-strong bg-surface"
    >
      {position === "left" ? SIDEBAR_PREVIEW : null}
      <span className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <span className="h-2 w-3/5 rounded-full bg-fg opacity-70" />
        <span className="h-1.5 w-full rounded-full bg-line" />
        <span className="h-1.5 w-4/5 rounded-full bg-line" />
        <span className="mt-auto h-5 rounded-md bg-accent-subtle" />
      </span>
      {position === "right" ? SIDEBAR_PREVIEW : null}
    </span>
  );
}
