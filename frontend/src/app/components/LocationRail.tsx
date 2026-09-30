/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Tooltip } from "radix-ui";
import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";
import {
  useBreadcrumbTrail,
  type BreadcrumbTrailItem,
} from "@/shared/ui/breadcrumb/breadcrumb-context";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

/** Each level is one vertical segment; the hit area is the segment plus the rail width. */
const SEGMENT_HIT = "group flex h-10 w-6 justify-center rounded-control py-0.5 outline-none";

/** "Acme › Schemas" for the levels above one. */
function ancestry(levels: BreadcrumbTrailItem[], depth: number): ReactNode {
  return levels.slice(0, depth).map((level, index) => (
    <Fragment key={`${index}-${level.to ?? ""}`}>
      {index > 0 ? " › " : null}
      {level.label}
    </Fragment>
  ));
}

/**
 * The breadcrumb as a vertical segmented rail: one segment per level, stacked
 * top to bottom and centered, the current page's in the accent color. It floats over the page's own
 * padding at the edge of the content, so it takes no width and draws no frame.
 * Hovering or focusing a line names that level; clicking opens it.
 */
export function LocationRail({ side }: { side: "left" | "right" }) {
  const levels = useBreadcrumbTrail()?.items ?? [];
  const last = levels.length - 1;
  if (levels.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      data-location-rail={side}
      // Only the lines take pointer events; the rest of the strip stays part of the page.
      className={cx(
        "pointer-events-none absolute inset-y-0 z-10 flex w-6 items-center justify-center",
        side === "left" ? "left-0" : "right-0",
      )}
    >
      <Tooltip.Provider delayDuration={80} skipDelayDuration={300}>
        <ol className="pointer-events-auto flex flex-col items-center">
          {levels.map((level, depth) => {
            const current = depth === last;
            const label = typeof level.label === "string" ? level.label : undefined;
            const tick = (
              <span
                aria-hidden="true"
                className={cx(
                  "h-full w-1 rounded-full transition-colors duration-150",
                  current
                    ? "bg-accent"
                    : "bg-line-strong group-hover:bg-fg-muted group-focus-visible:bg-fg-muted",
                )}
              />
            );

            return (
              <li key={`${depth}-${level.to ?? "current"}`}>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    {current || !level.to ? (
                      <span
                        tabIndex={0}
                        aria-label={label}
                        aria-current={current ? "page" : undefined}
                        className={cx(SEGMENT_HIT, FOCUS_RING)}
                      >
                        {tick}
                      </span>
                    ) : (
                      <Link
                        aria-label={label}
                        to={level.to}
                        className={cx(SEGMENT_HIT, "cursor-pointer", FOCUS_RING)}
                      >
                        {tick}
                      </Link>
                    )}
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      side={side === "left" ? "right" : "left"}
                      sideOffset={8}
                      collisionPadding={8}
                      className="z-(--z-popover) max-w-72 rounded-card border border-line bg-surface px-4 py-3 shadow-overlay"
                    >
                      <p className="truncate text-sm font-semibold text-fg">{level.label}</p>
                      {depth > 0 ? (
                        <p className="mt-0.5 line-clamp-2 text-sm text-fg-secondary">
                          {ancestry(levels, depth)}
                        </p>
                      ) : null}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </li>
            );
          })}
        </ol>
      </Tooltip.Provider>
    </nav>
  );
}
