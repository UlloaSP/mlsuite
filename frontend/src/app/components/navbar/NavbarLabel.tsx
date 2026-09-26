/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { cx } from "@/shared/ui/cx";

// Literal class sets so Tailwind can see them. Labels shrink to nothing when the
// bar is compact or the screen is narrow, and fade in once there is room.
const REVEAL = {
  lg: "lg:ml-2 lg:max-w-56 lg:opacity-100 lg:delay-150",
  xl: "xl:ml-2 xl:max-w-56 xl:opacity-100 xl:delay-150",
} as const;

/** Text beside a bar icon; it collapses in width instead of popping in and out. */
export function NavbarLabel({
  children,
  className,
  compact,
  from = "lg",
}: {
  children: ReactNode;
  className?: string;
  compact: boolean;
  from?: keyof typeof REVEAL;
}) {
  return (
    <span
      className={cx(
        "ml-0 min-w-0 max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,margin,opacity] duration-200 ease-out",
        !compact && REVEAL[from],
        className,
      )}
    >
      {children}
    </span>
  );
}
