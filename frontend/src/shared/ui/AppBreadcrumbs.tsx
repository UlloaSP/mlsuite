/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Fragment, type HTMLAttributes, type ReactNode } from "react";
import { Breadcrumb } from "./breadcrumb/Breadcrumb";
import type { BreadcrumbRoot, BreadcrumbTrailItem } from "./breadcrumb/breadcrumb-context";
import { BreadcrumbEllipsisMenu } from "./breadcrumb/BreadcrumbEllipsisMenu";
import { BreadcrumbItem } from "./breadcrumb/BreadcrumbItem";
import { BreadcrumbLink } from "./breadcrumb/BreadcrumbLink";
import { BreadcrumbList } from "./breadcrumb/BreadcrumbList";
import { BreadcrumbPage } from "./breadcrumb/BreadcrumbPage";
import { BreadcrumbRootItem } from "./breadcrumb/BreadcrumbRootItem";
import { BreadcrumbSeparator } from "./breadcrumb/BreadcrumbSeparator";
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
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {slots.map((slot, position) => (
          <Fragment key={slot.kind === "more" ? "more" : (slot.item.to ?? `item-${slot.index}`)}>
            <BreadcrumbItem>
              {slot.kind === "more" ? (
                <BreadcrumbEllipsisMenu items={slot.items} />
              ) : slot.index === 0 && root ? (
                <BreadcrumbRootItem current={last === 0} root={root} />
              ) : slot.index === last ? (
                <BreadcrumbPage>{slot.item.label}</BreadcrumbPage>
              ) : slot.item.to ? (
                <BreadcrumbLink to={slot.item.to}>{slot.item.label}</BreadcrumbLink>
              ) : (
                <span className="min-w-0 break-words text-fg-secondary">{slot.item.label}</span>
              )}
            </BreadcrumbItem>
            {position < slots.length - 1 ? <BreadcrumbSeparator /> : null}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
