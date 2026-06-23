/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { SidebarActions } from "./SidebarActions";
import { SidebarNavigation } from "./SidebarNavigation";
import { SidebarOrganizationHeader } from "./SidebarOrganizationHeader";
import { SidebarUserFooter } from "./SidebarUserFooter";
import {
  Sidebar as SidebarRoot,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "./app-sidebar";

export function Sidebar() {
  return (
    <SidebarRoot side="right">
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
