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
import { useLocationDisplay } from "@/shared/ui/location-display";
import { AppBreadcrumbRoots } from "@/app/components/AppBreadcrumbRoots";
import { AppGlobalSearch } from "@/app/components/AppGlobalSearch";
import { LocationBar } from "@/app/components/LocationBar";
import { LocationRail } from "@/app/components/LocationRail";
import { MobileSidebarTrigger } from "@/app/components/MobileSidebarTrigger";
import { Sidebar } from "@/app/components/Sidebar";
import { Navbar } from "@/app/components/navbar/Navbar";
import { SidebarInset } from "@/app/components/app-sidebar/SidebarInset";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { useDisplayShortcuts } from "./use-display-shortcuts";
import { useQuietScrollbars } from "./use-quiet-scrollbars";
import { useScrollMemory } from "./use-scroll-memory";
import { useRecordSectionLocation } from "@/app/components/section-memory";
import {
  useScopeInferenceSessionsToUser,
  useWarnOnUnsavedInferences,
} from "@/features/schemas/lib/inference-session-store";
import { useUser } from "@/capabilities/workspace-context/session";
import { useNavigationItems } from "@/app/components/use-navigation-items";

/** Records where the member is, per section; inside the breadcrumb roots to read page names. */
function SectionLocationRecorder() {
  useRecordSectionLocation(useNavigationItems().activeRoot);
  return null;
}

export function AppShellFrame({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const position = useAtomValue(navigationPositionAtom);
  const vertical = isSidebarPosition(position);
  const floating = useAtomValue(sidebarStyleAtom) === "floating";
  useDisplayShortcuts();
  useQuietScrollbars(floating);
  useScrollMemory();
  useWarnOnUnsavedInferences();
  useScopeInferenceSessionsToUser(useUser().data?.id);
  const location = useLocationDisplay();

  return (
    <AppBreadcrumbRoots>
      <SectionLocationRecorder />
      <SidebarProvider open={!collapsed} onOpenChange={(open: boolean) => setCollapsed(!open)}>
        <div
          data-navigation-position={position}
          data-navigation-style={floating ? "floating" : "fixed"}
          className={cx(
            // clip, not hidden: see base.css, a hidden box can still be scrolled.
            "flex h-dvh w-screen overflow-clip bg-surface text-fg",
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
              {location === "rail-left" ? <LocationRail side="left" /> : null}
              {location === "rail-right" ? <LocationRail side="right" /> : null}
            </div>
            {location === "breadcrumb-bottom" ? <LocationBar /> : null}
          </SidebarInset>
          {position === "right" ? <Sidebar side="right" /> : null}
          {position === "bottom" ? <Navbar position="bottom" /> : null}
          <AppGlobalSearch />
        </div>
      </SidebarProvider>
    </AppBreadcrumbRoots>
  );
}
