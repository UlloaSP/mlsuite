/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import type { PropsWithChildren } from "react";
import { sidebarCollapsedAtom } from "../app/atoms";
import { AppGlobalSearch } from "../app/components/AppGlobalSearch";
import { MobileSidebarTrigger } from "../app/components/MobileSidebarTrigger";
import { Sidebar } from "../app/components/Sidebar";
import { SidebarInset, SidebarProvider } from "../app/components/app-sidebar";

export function AppShellFrame({ children }: PropsWithChildren) {
  const [collapsed, setCollapsed] = useAtom(sidebarCollapsedAtom);

  return (
    <SidebarProvider open={!collapsed} onOpenChange={(open: boolean) => setCollapsed(!open)}>
      <div className="flex h-screen w-screen overflow-hidden bg-[var(--page-bg)] text-[var(--text-primary)]">
        <SidebarInset>
          <MobileSidebarTrigger />
          <div className="app-content-transition relative min-h-0 min-w-0 flex-1 overflow-hidden [view-transition-name:app-content]">
            {children}
          </div>
        </SidebarInset>
        <Sidebar />
        <AppGlobalSearch />
      </div>
    </SidebarProvider>
  );
}
