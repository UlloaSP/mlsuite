/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { type ComponentProps } from "react";
import { cx } from "../cx";
import { FOCUS_RING } from "../focus-ring";
import { useSidebar } from "./SidebarContext";

export function SidebarTrigger({ className, ...props }: ComponentProps<"button">) {
  const { state, toggleSidebar } = useSidebar();
  const Icon = state === "collapsed" ? PanelRightOpen : PanelRightClose;
  const label = state === "collapsed" ? "Expand" : "Collapse";

  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={state === "expanded"}
      onClick={toggleSidebar}
      className={cx("inline-flex items-center justify-center", FOCUS_RING, className)}
      {...props}
    >
      <Icon size={18} />
      <span className="sr-only">{label}</span>
    </button>
  );
}
