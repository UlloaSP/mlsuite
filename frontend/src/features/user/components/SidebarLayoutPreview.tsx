/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "@/shared/ui/cx";
import type { NavigationPosition, SidebarStyle } from "@/shared/ui/sidebar-preferences";

const EDGE_BORDER: Record<NavigationPosition, string> = {
  left: "border-r",
  right: "border-l",
  top: "border-b",
  bottom: "border-t",
};

/** Miniature app shell showing where navigation sits and how it meets the page. */
export function SidebarLayoutPreview({
  position,
  variant,
}: {
  position: NavigationPosition;
  variant: SidebarStyle;
}) {
  const horizontal = position === "top" || position === "bottom";
  const frame = cx(
    "flex shrink-0 gap-2 bg-surface-muted p-2",
    horizontal ? "h-7 items-center" : "w-10 flex-col",
    variant === "floating"
      ? "m-1.5 rounded-lg border border-line-strong shadow-card"
      : cx("border-line", EDGE_BORDER[position]),
  );
  const navigation = (
    <span className={frame}>
      <span className="size-3.5 shrink-0 rounded-md bg-accent" />
      {[0, 1, 2].map((key) => (
        <span
          key={key}
          className={cx(
            "rounded-full bg-line-strong",
            horizontal ? "h-1.5 w-5" : "h-1.5",
            !horizontal && key === 0 && "mt-2",
          )}
        />
      ))}
    </span>
  );

  return (
    <span
      aria-hidden="true"
      className={cx(
        "flex h-24 w-full max-w-56 overflow-hidden rounded-xl border border-line-strong bg-page",
        horizontal && "flex-col",
      )}
    >
      {position === "left" || position === "top" ? navigation : null}
      <span className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 p-3">
        <span className="h-2 w-3/5 rounded-full bg-fg opacity-70" />
        <span className="h-1.5 w-full rounded-full bg-line" />
        <span className="mt-auto h-4 rounded-md bg-accent-subtle" />
      </span>
      {position === "right" || position === "bottom" ? navigation : null}
    </span>
  );
}
