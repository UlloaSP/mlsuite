/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "@/shared/ui/cx";
import type { LocationDisplay } from "@/shared/ui/sidebar-preferences";

/** A small breadcrumb: three segments of decreasing weight, the last one current. */
function Crumbs() {
  return (
    <span className="flex items-center gap-1">
      <span className="h-1.5 w-4 rounded-full bg-line-strong" />
      <span className="h-1.5 w-3 rounded-full bg-line-strong" />
      <span className="h-1.5 w-5 rounded-full bg-accent" />
    </span>
  );
}

/** The rail: vertical segments stacked at the page's edge, no frame, the current one in accent. */
function Rail({ side }: { side: "left" | "right" }) {
  return (
    <span
      className={cx(
        "absolute inset-y-0 flex w-3 flex-col items-center justify-center gap-0.5",
        side === "left" ? "left-0.5" : "right-0.5",
      )}
    >
      {[0, 1, 2, 3].map((level) => (
        <span
          key={level}
          className={cx("h-3 w-0.5 rounded-full", level === 3 ? "bg-accent" : "bg-line-strong")}
        />
      ))}
    </span>
  );
}

/** Miniature page showing where the breadcrumb is drawn, if anywhere. */
export function LocationLayoutPreview({ display }: { display: LocationDisplay }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-24 w-full max-w-56 flex-col overflow-hidden rounded-xl border border-line-strong bg-page"
    >
      <span className="flex min-w-0 flex-1 flex-col gap-2 p-3">
        {display === "breadcrumb-top" ? <Crumbs /> : null}
        <span className="h-2 w-3/5 rounded-full bg-fg opacity-70" />
        <span className="h-1.5 w-full rounded-full bg-line" />
        <span className="mt-auto h-4 rounded-md bg-accent-subtle" />
      </span>
      {display === "rail-left" ? <Rail side="left" /> : null}
      {display === "rail-right" ? <Rail side="right" /> : null}
      {display === "breadcrumb-bottom" ? (
        <span className="flex shrink-0 items-center border-t border-line bg-surface-muted px-3 py-1.5">
          <Crumbs />
        </span>
      ) : null}
    </span>
  );
}
