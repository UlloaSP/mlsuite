/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { HTMLAttributes, ReactNode } from "react";
import { Children, Fragment, isValidElement } from "react";
import { AppBreadcrumbs, type AppBreadcrumbItem } from "./AppBreadcrumbs";
import { usePageTrail, type BreadcrumbScope } from "./breadcrumb/breadcrumb-context";
import { useLocationDisplay } from "./location-display";
import { AppEyebrow } from "./AppEyebrow";
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
  breadcrumbScope = "organization",
  actions,
  actionLayout = "default",
  className,
}: Omit<HTMLAttributes<HTMLDivElement>, "title"> & {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** The levels below the root; the root crumb comes from `breadcrumbScope`. */
  breadcrumbs?: AppBreadcrumbItem[];
  /** Who the page belongs to: the current organization (default), your account, or the platform. */
  breadcrumbScope?: BreadcrumbScope;
  actions?: ReactNode;
  actionLayout?: "default" | "checkerboard";
}) {
  // Every page has a trail, like a portal: without explicit levels the page's own
  // title is the current crumb, and a scope's home page is just its root.
  const levels = breadcrumbs ?? (typeof title === "string" ? [{ label: title }] : []);
  const { root, trail } = usePageTrail(levels, breadcrumbScope);
  // The bottom bar and the rail are drawn by the app shell instead.
  const inlineTrail = useLocationDisplay() === "breadcrumb-top";
  const actionNodes = flattenActionNodes(actions).slice(0, 4);
  // An eyebrow that says the title again ("Models" over "Models") is noise.
  const repeatsTitle =
    typeof eyebrow === "string" &&
    typeof title === "string" &&
    eyebrow.trim().toLowerCase() === title.trim().toLowerCase();
  const checkerboard = actionLayout === "checkerboard";
  const positionedActions = actionNodes.map((node, index) => ({
    node,
    position: ACTION_POSITIONS[index],
    slot: ACTION_SLOT_NAMES[index],
  }));

  return (
    <div className="min-w-0 flex-shrink-0">
      {/* Always top-left, outside `className`, so it sits in the same place on
          every page, including centered form pages. */}
      {inlineTrail && trail.length > 0 ? (
        <AppBreadcrumbs items={trail} root={root} className="mb-3 max-w-full" />
      ) : null}
      {/* No outer margin: the page body owns the gap after the header (gap-6). */}
      <header className={cx("flex-shrink-0", className)}>
        <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            {eyebrow && !repeatsTitle ? (
              <AppEyebrow className="mb-1 text-accent">{eyebrow}</AppEyebrow>
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
              className={
                checkerboard
                  ? "grid w-full shrink-0 grid-cols-2 gap-2 sm:w-96"
                  : // Right-first like the checkerboard: the first action sits at the outer
                    // edge. Left-aligned on small screens, right-aligned from sm up.
                    "flex shrink-0 flex-row-reverse flex-wrap items-center justify-end gap-2 sm:justify-start"
              }
            >
              {positionedActions.map(({ node, position, slot }) => (
                <div
                  key={isValidElement(node) ? (node.key ?? slot) : slot}
                  data-page-header-action={slot}
                  className={cx(
                    checkerboard &&
                      // Equal slots only; each action keeps the variant it declares.
                      cx(position, "min-w-0 [&_a]:w-full [&_button]:w-full"),
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
