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
const ACTION_SLOT_NAMES = ["top-right", "top-left", "bottom-right", "bottom-left"];

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
  actionLayout = "default",
  className,
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: AppBreadcrumbItem[];
  actions?: ReactNode;
  actionLayout?: "default" | "checkerboard";
}) {
  const actionNodes = flattenActionNodes(actions).slice(0, 4);
  const positionedActions = actionNodes.map((node, index) => ({
    node,
    position: ACTION_POSITIONS[index],
    slot: ACTION_SLOT_NAMES[index],
  }));

  return (
    <div className={cx("min-w-0 flex-shrink-0", className)}>
      {breadcrumbs ? <AppBreadcrumbs items={breadcrumbs} className="mb-5 max-w-full" /> : null}
      <header className="my-5 flex-shrink-0">
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="mb-1 font-mono text-2xs font-semibold uppercase tracking-eyebrow text-accent">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-3xl font-semibold leading-[1.05] tracking-[-0.8px] text-fg">
              {title}
            </h1>
            {description ? (
              <p className="mt-1.5 max-w-2xl text-sm leading-5 text-fg-muted">{description}</p>
            ) : null}
          </div>
          {actionNodes.length > 0 ? (
            <div
              className={cx(
                "grid shrink-0 grid-cols-2 gap-2",
                actionLayout === "checkerboard" && "w-full sm:w-96",
              )}
            >
              {positionedActions.map(({ node, position, slot }) => (
                <div
                  key={isValidElement(node) ? (node.key ?? slot) : slot}
                  data-page-header-action={slot}
                  className={cx(
                    position,
                    actionLayout === "checkerboard" &&
                      // Equal slots only; each action keeps the variant it declares.
                      "h-12 min-w-0 [&_a]:block [&_a]:h-full [&_button]:h-full [&_button]:w-full",
                  )}
                >
                  {node}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </header>
    </div>
  );
}
