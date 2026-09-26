/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { type ComponentProps } from "react";
import type { SidebarPosition } from "@/shared/ui/sidebar-position";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { useSidebar } from "./SidebarContext";

type SidebarTriggerProps = ComponentProps<"button"> & {
  side?: SidebarPosition;
};

/**
 * Toggles the sidebar. With children, they are the resting face and the panel
 * icon replaces them on hover or keyboard focus.
 */
export function SidebarTrigger({
  children,
  className,
  side = "right",
  ...props
}: SidebarTriggerProps) {
  const { state, isMobile, openMobile, toggleSidebar } = useSidebar();
  const expanded = isMobile ? openMobile : state === "expanded";
  const Icon =
    side === "left"
      ? !expanded
        ? PanelLeftOpen
        : PanelLeftClose
      : !expanded
        ? PanelRightOpen
        : PanelRightClose;
  const label = expanded ? "Collapse sidebar" : "Expand sidebar";

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      title={label}
      onClick={toggleSidebar}
      className={cx("group inline-flex items-center justify-center", FOCUS_RING, className)}
      {...props}
    >
      {children ? (
        <span aria-hidden="true" className="contents group-hover:hidden group-focus-visible:hidden">
          {children}
        </span>
      ) : null}
      <Icon
        size={18}
        className={children ? "hidden group-hover:block group-focus-visible:block" : undefined}
      />
      <span className="sr-only">{label}</span>
    </button>
  );
}
