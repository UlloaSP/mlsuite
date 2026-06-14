/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Fragment, type HTMLAttributes, type ReactNode } from "react";
import {
  Breadcrumb,
  BreadcrumbCollapsedMenu,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "./breadcrumb";

export type AppBreadcrumbItem = {
  label: ReactNode;
  to?: string;
};

type BreadcrumbSegment =
  | { kind: "item"; item: AppBreadcrumbItem }
  | { hiddenItems: AppBreadcrumbItem[]; kind: "ellipsis" };

function collapseBreadcrumbs(items: AppBreadcrumbItem[]): BreadcrumbSegment[] {
  if (items.length <= 3) {
    return items.map((item) => ({ item, kind: "item" }));
  }

  return [
    { item: items[0], kind: "item" },
    { hiddenItems: items.slice(1, -2), kind: "ellipsis" },
    { item: items[items.length - 2], kind: "item" },
    { item: items[items.length - 1], kind: "item" },
  ];
}

export function AppBreadcrumbs({
  items,
  className,
}: HTMLAttributes<HTMLElement> & {
  items: AppBreadcrumbItem[];
}) {
  const visibleItems = collapseBreadcrumbs(items);

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList className="flex-nowrap">
        {visibleItems.map((segment, index) => {
          const isLast = index === visibleItems.length - 1;
          const item = segment.kind === "item" ? segment.item : undefined;
          const key =
            segment.kind === "item"
              ? `${index}-${item?.to ?? "current"}-${String(item?.label)}`
              : `${index}-ellipsis`;

          return (
            <Fragment key={key}>
              <BreadcrumbItem>
                {segment.kind === "ellipsis" ? (
                  <BreadcrumbCollapsedMenu items={segment.hiddenItems} />
                ) : item?.to && !isLast ? (
                  <BreadcrumbLink to={item.to}>{item.label}</BreadcrumbLink>
                ) : isLast ? (
                  <BreadcrumbPage>{item?.label}</BreadcrumbPage>
                ) : (
                  <span className="truncate text-[var(--text-secondary)]">
                    {item?.label}
                  </span>
                )}
              </BreadcrumbItem>
              {!isLast ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
