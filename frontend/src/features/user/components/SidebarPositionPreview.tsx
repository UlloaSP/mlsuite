/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SidebarPosition } from "@/shared/ui/sidebar-position";

const SIDEBAR_PREVIEW = (
  <span className="flex w-10 shrink-0 flex-col gap-2 bg-[var(--surface-muted)] p-2">
    <span className="size-4 rounded-md bg-[var(--accent-primary)]" />
    <span className="mt-2 h-1.5 rounded-full bg-[var(--border-strong)]" />
    <span className="h-1.5 rounded-full bg-[var(--border-strong)]" />
    <span className="h-1.5 rounded-full bg-[var(--border-strong)]" />
  </span>
);

export function SidebarPositionPreview({ position }: { position: SidebarPosition }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-24 w-full max-w-56 overflow-hidden rounded-xl border border-[var(--border-strong)] bg-[var(--surface-primary)]"
    >
      {position === "left" ? SIDEBAR_PREVIEW : null}
      <span className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <span className="h-2 w-3/5 rounded-full bg-[var(--text-primary)] opacity-70" />
        <span className="h-1.5 w-full rounded-full bg-[var(--border-soft)]" />
        <span className="h-1.5 w-4/5 rounded-full bg-[var(--border-soft)]" />
        <span className="mt-auto h-5 rounded-md bg-[var(--accent-quiet)]" />
      </span>
      {position === "right" ? SIDEBAR_PREVIEW : null}
    </span>
  );
}
