/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Fragment, type HTMLAttributes, type ReactNode } from "react";
import { Breadcrumb } from "./breadcrumb/Breadcrumb";
import { BreadcrumbItem } from "./breadcrumb/BreadcrumbItem";
import { BreadcrumbLink } from "./breadcrumb/BreadcrumbLink";
import { BreadcrumbList } from "./breadcrumb/BreadcrumbList";
import { BreadcrumbPage } from "./breadcrumb/BreadcrumbPage";
import { BreadcrumbSeparator } from "./breadcrumb/BreadcrumbSeparator";

export type AppBreadcrumbItem = {
  label: ReactNode;
  to?: string;
};

export function AppBreadcrumbs({
  items,
  className,
}: HTMLAttributes<HTMLElement> & {
  items: AppBreadcrumbItem[];
}) {
  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <Fragment key={item.to ?? index}>
              <BreadcrumbItem>
                {item.to && !isLast ? (
                  <BreadcrumbLink to={item.to}>{item.label}</BreadcrumbLink>
                ) : isLast ? (
                  <BreadcrumbPage>{item.label}</BreadcrumbPage>
                ) : (
                  <span className="min-w-0 break-words text-[var(--text-secondary)]">
                    {item.label}
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
