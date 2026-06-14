/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes, ReactNode } from "react";
import { Children, Fragment, isValidElement } from "react";
import { AppBreadcrumbs, type AppBreadcrumbItem } from "./AppBreadcrumbs";
import { cx } from "./cx";

const ACTION_POSITIONS = [
  "col-start-2 row-start-1",
  "col-start-1 row-start-1",
  "col-start-2 row-start-2",
  "col-start-1 row-start-2",
];

function flattenActionNodes(nodes: ReactNode): ReactNode[] {
  return Children.toArray(nodes).flatMap((node) => {
    if (isValidElement(node) && node.type === Fragment) {
      return flattenActionNodes((node.props as { children?: ReactNode }).children);
    }
    return [node];
  });
}

export function AppPageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: AppBreadcrumbItem[];
  actions?: ReactNode;
}) {
  const actionNodes = flattenActionNodes(actions).slice(0, 4);

  return (
    <div className={cx("min-w-0 flex-shrink-0", className)}>
      {breadcrumbs ? <AppBreadcrumbs items={breadcrumbs} className="mb-5 max-w-full" /> : null}
      <header className="my-5 flex-shrink-0">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--accent-primary)]">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-[27px] font-semibold leading-[1.05] tracking-[-0.8px] text-[var(--text-primary)]">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-[var(--text-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          {actionNodes.length > 0 ? (
            <div className="grid shrink-0 grid-cols-2 gap-2">
              {actionNodes.map((actionNode, index) => (
                <div key={index} className={ACTION_POSITIONS[index]}>
                  {actionNode}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </header>
    </div>
  );
}
