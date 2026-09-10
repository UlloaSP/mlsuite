/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SidebarPosition } from "@/shared/ui/sidebar-position";
import { SidebarActions } from "./SidebarActions";
import { SidebarNavigation } from "./SidebarNavigation";
import { SidebarOrganizationHeader } from "./SidebarOrganizationHeader";
import { SidebarUserFooter } from "./SidebarUserFooter";
import { Sidebar as SidebarRoot } from "./app-sidebar/Sidebar";
import { SidebarContent } from "./app-sidebar/SidebarContent";
import { SidebarFooter } from "./app-sidebar/SidebarFooter";
import { SidebarHeader } from "./app-sidebar/SidebarHeader";

export function Sidebar({ side }: { side: SidebarPosition }) {
  return (
    <SidebarRoot data-user-guide="sidebar" side={side}>
      <div className="flex size-full flex-col overflow-hidden">
        <SidebarHeader>
          <SidebarOrganizationHeader />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNavigation />
        </SidebarContent>
        <div className="shrink-0 border-t border-[var(--border-soft)] px-3 py-2">
          <SidebarActions />
        </div>
        <SidebarFooter className="border-t border-[var(--border-soft)]">
          <SidebarUserFooter />
        </SidebarFooter>
      </div>
    </SidebarRoot>
  );
}
