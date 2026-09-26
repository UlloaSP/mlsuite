/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom, useAtomValue } from "jotai";
import type { PropsWithChildren } from "react";
import {
  isSidebarPosition,
  navigationPositionAtom,
  sidebarStyleAtom,
} from "@/shared/ui/sidebar-preferences";
import { sidebarCollapsedAtom } from "@/shared/ui/ui-state";
import { cx } from "@/shared/ui/cx";
import { AppGlobalSearch } from "@/app/components/AppGlobalSearch";
import { MobileSidebarTrigger } from "@/app/components/MobileSidebarTrigger";
import { Sidebar } from "@/app/components/Sidebar";
import { Navbar } from "@/app/components/navbar/Navbar";
import { SidebarInset } from "@/app/components/app-sidebar/SidebarInset";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { useDisplayShortcuts } from "./use-display-shortcuts";
import { useQuietScrollbars } from "./use-quiet-scrollbars";

export function AppShellFrame({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const position = useAtomValue(navigationPositionAtom);
  const vertical = isSidebarPosition(position);
  const floating = useAtomValue(sidebarStyleAtom) === "floating";
  useDisplayShortcuts();
  useQuietScrollbars(floating);

  return (
    <SidebarProvider open={!collapsed} onOpenChange={(open: boolean) => setCollapsed(!open)}>
      <div
        data-navigation-position={position}
        data-navigation-style={floating ? "floating" : "fixed"}
        className={cx(
          // clip, not hidden: see base.css, a hidden box can still be scrolled.
          "flex h-screen w-screen overflow-clip bg-surface text-fg",
          // Pages that size against the viewport subtract the bar (h-14, plus its inset when floating).
          !vertical && "flex-col",
          !vertical && (floating ? "[--app-nav-block:4rem]" : "[--app-nav-block:3.5rem]"),
        )}
      >
        {position === "left" ? <Sidebar side="left" /> : null}
        {position === "top" ? <Navbar position="top" /> : null}
        <SidebarInset>
          {vertical ? <MobileSidebarTrigger side={position} /> : null}
          <div className="app-content-transition relative min-h-0 min-w-0 flex-1 overflow-clip [view-transition-name:app-content]">
            {children}
          </div>
        </SidebarInset>
        {position === "right" ? <Sidebar side="right" /> : null}
        {position === "bottom" ? <Navbar position="bottom" /> : null}
        <AppGlobalSearch />
      </div>
    </SidebarProvider>
  );
}
