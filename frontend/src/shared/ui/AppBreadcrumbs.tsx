/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronRight } from "lucide-react";
import { Fragment, type HTMLAttributes, type ReactNode } from "react";
import { Link } from "react-router";
import type { BreadcrumbRoot, BreadcrumbTrailItem } from "./breadcrumb/breadcrumb-context";
import { BreadcrumbEllipsisMenu } from "./breadcrumb/BreadcrumbEllipsisMenu";
import { BreadcrumbRootItem } from "./breadcrumb/BreadcrumbRootItem";
import { CRUMB_LINK_CLASS, CRUMB_PAGE_CLASS } from "./breadcrumb/crumb-styles";
import { cx } from "./cx";
import { useMediaQuery } from "./use-media-query";

export type AppBreadcrumbItem = {
  label: ReactNode;
  to?: string;
};

type Slot =
  | { kind: "item"; item: BreadcrumbTrailItem; index: number }
  | { kind: "more"; items: BreadcrumbTrailItem[] };

/** Keep the first crumb and the last `max - 2`; everything between becomes one "…" menu. */
function collapse(items: BreadcrumbTrailItem[], max: number): Slot[] {
  const all = items.map((item, index) => ({ kind: "item" as const, item, index }));
  if (items.length <= max) return all;
  const tail = max - 2;
  return [
    all[0],
    { kind: "more", items: items.slice(1, items.length - tail) },
    ...all.slice(items.length - tail),
  ];
}

export function AppBreadcrumbs({
  items,
  root,
  className,
}: HTMLAttributes<HTMLElement> & {
  /** The full trail; when `root` is given, `items[0]` is that root. */
  items: AppBreadcrumbItem[];
  root?: BreadcrumbRoot;
}) {
  // Phones keep only the root and the current page around the "…" menu.
  const narrow = useMediaQuery("(max-width: 639px)");
  const slots = collapse(items, narrow ? 3 : 5);
  const last = items.length - 1;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cx("relative z-20 flex min-w-0 overflow-visible text-sm", className)}
    >
      <ol className="flex min-w-0 flex-wrap items-center gap-2 break-words overflow-visible">
        {slots.map((slot, position) => (
          <Fragment key={slot.kind === "more" ? "more" : (slot.item.to ?? `item-${slot.index}`)}>
            <li className="inline-flex min-w-0 items-center gap-2">
              {slot.kind === "more" ? (
                <BreadcrumbEllipsisMenu items={slot.items} />
              ) : slot.index === 0 && root ? (
                <BreadcrumbRootItem current={last === 0} root={root} />
              ) : slot.index === last ? (
                <span aria-current="page" className={CRUMB_PAGE_CLASS}>
                  {slot.item.label}
                </span>
              ) : slot.item.to ? (
                <Link className={CRUMB_LINK_CLASS} to={slot.item.to}>
                  {slot.item.label}
                </Link>
              ) : (
                <span className="min-w-0 break-words text-fg-secondary">{slot.item.label}</span>
              )}
            </li>
            {position < slots.length - 1 ? (
              <li aria-hidden="true" className="shrink-0 text-fg-muted" role="presentation">
                <ChevronRight size={14} />
              </li>
            ) : null}
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
