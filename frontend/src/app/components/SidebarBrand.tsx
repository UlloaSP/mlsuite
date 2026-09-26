/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { MLSuiteWordmark } from "@/shared/ui/MLSuiteWordmark";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { useSidebar } from "./app-sidebar/SidebarContext";

export function SidebarBrand() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Link
      to="/home"
      viewTransition
      aria-label="MLsuite home"
      className={cx(
        "mb-2 flex h-12 items-center gap-3 rounded-xl text-2xl leading-none text-fg",
        collapsed ? "justify-center" : "px-2.5",
        FOCUS_RING,
      )}
    >
      <img
        alt=""
        aria-hidden="true"
        className="h-auto w-10 shrink-0"
        height="635"
        src="/mlsuite.png"
        width="1181"
      />
      <SidebarLabel aria-hidden="true" className={collapsed ? "w-0 flex-none" : undefined}>
        <MLSuiteWordmark />
      </SidebarLabel>
    </Link>
  );
}
