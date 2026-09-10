/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import type { PropsWithChildren } from "react";
import { sidebarPositionAtom } from "@/shared/ui/sidebar-position";
import { sidebarCollapsedAtom } from "@/shared/ui/ui-state";
import { AppGlobalSearch } from "@/app/components/AppGlobalSearch";
import { MobileSidebarTrigger } from "@/app/components/MobileSidebarTrigger";
import { Sidebar } from "@/app/components/Sidebar";
import { SidebarInset } from "@/app/components/app-sidebar/SidebarInset";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";

export function AppShellFrame({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);
  const [sidebarPosition] = useAtom(sidebarPositionAtom);

  return (
    <SidebarProvider open={!collapsed} onOpenChange={(open: boolean) => setCollapsed(!open)}>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
        {sidebarPosition === "left" ? <Sidebar side={sidebarPosition} /> : null}
        <SidebarInset>
          <MobileSidebarTrigger side={sidebarPosition} />
          <div className="app-content-transition relative min-h-0 min-w-0 flex-1 overflow-hidden [view-transition-name:app-content]">
            {children}
          </div>
        </SidebarInset>
        {sidebarPosition === "right" ? <Sidebar side={sidebarPosition} /> : null}
        <AppGlobalSearch />
      </div>
    </SidebarProvider>
  );
}
