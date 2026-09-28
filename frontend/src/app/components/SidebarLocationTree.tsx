/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { useBreadcrumbTrail } from "@/shared/ui/breadcrumb/breadcrumb-context";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { SidebarGroup } from "./app-sidebar/SidebarGroup";
import { SidebarGroupContent } from "./app-sidebar/SidebarGroupContent";
import { SidebarGroupLabel } from "./app-sidebar/SidebarGroupLabel";
import { useSidebar } from "./app-sidebar/SidebarContext";

/**
 * The current page's breadcrumb trail as a directory tree. The root is the
 * organization header above, so the tree starts one level below it, and it only
 * appears once the page is nested deeper than a section.
 */
export function SidebarLocationTree() {
  const trail = useBreadcrumbTrail();
  const { state } = useSidebar();
  const levels = trail?.slice(1) ?? [];
  if (state === "collapsed" || levels.length < 2) return null;
  const last = levels.length - 1;

  return (
    <SidebarGroup>
      <SidebarGroupLabel>You are here</SidebarGroupLabel>
      <SidebarGroupContent>
        <ol aria-label="Current location" className="flex flex-col">
          {levels.map((level, depth) => (
            <li
              key={`${depth}-${level.to ?? "current"}`}
              // Each level sits one step right of its parent, with a guide line.
              style={{ paddingLeft: `${depth * 0.75}rem` }}
              className="min-w-0"
            >
              <div
                className={cx(
                  "flex min-w-0 items-center gap-2 border-l py-1 pl-2.5 text-sm",
                  depth === last ? "border-accent" : "border-line",
                )}
              >
                {depth === last || !level.to ? (
                  <span
                    aria-current={depth === last ? "page" : undefined}
                    className={cx(
                      "truncate",
                      depth === last ? "font-semibold text-fg" : "text-fg-secondary",
                    )}
                  >
                    {level.label}
                  </span>
                ) : (
                  <Link
                    to={level.to}
                    className={cx(
                      "truncate rounded-control text-fg-secondary transition hover:text-fg",
                      FOCUS_RING,
                    )}
                  >
                    {level.label}
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ol>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
