/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "@/shared/ui/cx";
import type { SidebarPosition, SidebarStyle } from "@/shared/ui/sidebar-preferences";

/** Miniature app shell showing where the sidebar sits and how it meets the page. */
export function SidebarLayoutPreview({
  position,
  variant,
}: {
  position: SidebarPosition;
  variant: SidebarStyle;
}) {
  const floating = variant === "floating";
  const sidebar = (
    <span
      className={cx(
        "flex w-10 shrink-0 flex-col gap-2 bg-surface-muted p-2",
        floating
          ? "m-1.5 rounded-lg border border-line-strong shadow-card"
          : position === "left"
            ? "border-r border-line"
            : "border-l border-line",
      )}
    >
      <span className="size-4 rounded-md bg-accent" />
      <span className="mt-2 h-1.5 rounded-full bg-line-strong" />
      <span className="h-1.5 rounded-full bg-line-strong" />
      <span className="h-1.5 rounded-full bg-line-strong" />
    </span>
  );

  return (
    <span
      aria-hidden="true"
      className="flex h-24 w-full max-w-56 overflow-hidden rounded-xl border border-line-strong bg-page"
    >
      {position === "left" ? sidebar : null}
      <span className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <span className="h-2 w-3/5 rounded-full bg-fg opacity-70" />
        <span className="h-1.5 w-full rounded-full bg-line" />
        <span className="h-1.5 w-4/5 rounded-full bg-line" />
        <span className="mt-auto h-5 rounded-md bg-accent-subtle" />
      </span>
      {position === "right" ? sidebar : null}
    </span>
  );
}
