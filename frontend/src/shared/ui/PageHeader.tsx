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
const PRIMARY_ACTION_TONE =
  "[&_button]:border-transparent [&_button]:bg-[var(--accent-primary)] [&_button]:text-[var(--text-inverse)] [&_button:hover]:bg-[var(--accent-primary-strong)]";
const SECONDARY_ACTION_TONE =
  "[&_button]:border-[var(--border-soft)] [&_button]:bg-[var(--surface-primary)] [&_button]:text-[var(--text-primary)] [&_button:hover]:border-[var(--text-primary)] [&_button:hover]:bg-[var(--surface-muted)]";
const CHECKERBOARD_TONES = [
  PRIMARY_ACTION_TONE,
  SECONDARY_ACTION_TONE,
  SECONDARY_ACTION_TONE,
  PRIMARY_ACTION_TONE,
];
const CHECKERBOARD_TONE_NAMES = ["primary", "secondary", "secondary", "primary"];
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
    tone: CHECKERBOARD_TONE_NAMES[index],
    toneClass: CHECKERBOARD_TONES[index],
  }));

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
            <div
              className={cx(
                "grid shrink-0 grid-cols-2 gap-2",
                actionLayout === "checkerboard" && "w-full sm:w-96",
              )}
            >
              {positionedActions.map(({ node, position, slot, tone, toneClass }) => (
                <div
                  key={isValidElement(node) ? (node.key ?? slot) : slot}
                  data-page-header-action={slot}
                  data-tone={actionLayout === "checkerboard" ? tone : undefined}
                  className={cx(
                    position,
                    actionLayout === "checkerboard" &&
                      `h-12 min-w-0 [&_a]:block [&_a]:h-full [&_button]:h-full [&_button]:w-full ${toneClass}`,
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
