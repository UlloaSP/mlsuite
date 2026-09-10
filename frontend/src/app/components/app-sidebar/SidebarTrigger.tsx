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

export function SidebarTrigger({ className, side = "right", ...props }: SidebarTriggerProps) {
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
  const label = expanded ? "Collapse" : "Expand";

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={expanded}
      onClick={toggleSidebar}
      className={cx("inline-flex items-center justify-center", FOCUS_RING, className)}
      {...props}
    >
      <Icon size={18} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
