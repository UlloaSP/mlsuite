/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes, ReactNode } from "react";
import { AppBreadcrumbs, type AppBreadcrumbItem } from "./AppBreadcrumbs";
import { isTrail, usePageTrail } from "./breadcrumb/breadcrumb-context";
import { useLocationDisplay } from "./location-display";
import { cx } from "./cx";

export function AppPageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  title: ReactNode;
  description?: ReactNode;
  /** From the section's own page down to this one; a page with a single level shows no trail. */
  breadcrumbs?: AppBreadcrumbItem[];
  actions?: ReactNode;
}) {
  const trail = breadcrumbs ?? [];
  usePageTrail(trail);
  // The bottom bar and the rail are drawn by the app shell instead.
  const inlineTrail = useLocationDisplay() === "breadcrumb-top";

  return (
    <div className="min-w-0 flex-shrink-0">
      {/* Always top-left, outside `className`, so it sits in the same place on
          every page, including centered form pages. */}
      {inlineTrail && isTrail(trail) ? (
        <AppBreadcrumbs items={trail} className="mb-3 max-w-full" />
      ) : null}
      {/* No outer margin: the page body owns the gap after the header (gap-6). */}
      <header className={cx("flex-shrink-0", className)}>
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.8px] text-fg">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-fg-muted">{description}</p>
            ) : null}
          </div>
          {actions ? (
            // The first action sits at the outer edge: left-aligned on small screens,
            // right-aligned from sm up.
            <div className="flex shrink-0 flex-row-reverse flex-wrap items-center justify-end gap-2 sm:justify-start">
              {actions}
            </div>
          ) : null}
        </div>
      </header>
    </div>
  );
}
