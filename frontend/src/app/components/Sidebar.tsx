/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtomValue } from "jotai";
import { sidebarStyleAtom, type SidebarPosition } from "@/shared/ui/sidebar-preferences";
import { SidebarActions } from "./SidebarActions";
import { SidebarBrand } from "./SidebarBrand";
import { SidebarNavigation } from "./SidebarNavigation";
import { SidebarOrganizationHeader } from "./SidebarOrganizationHeader";
import { SidebarUserFooter } from "./SidebarUserFooter";
import { Sidebar as SidebarRoot } from "./app-sidebar/Sidebar";
import { SidebarContent } from "./app-sidebar/SidebarContent";
import { SidebarFooter } from "./app-sidebar/SidebarFooter";
import { SidebarHeader } from "./app-sidebar/SidebarHeader";

export function Sidebar({ side }: { side: SidebarPosition }) {
  const variant = useAtomValue(sidebarStyleAtom);

  return (
    <SidebarRoot data-user-guide="sidebar" side={side} variant={variant}>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <SidebarHeader>
          <SidebarBrand side={side} />
          <SidebarOrganizationHeader />
        </SidebarHeader>
        <SidebarContent>
          <SidebarNavigation />
        </SidebarContent>
        <div className="shrink-0 border-t border-line px-3 py-2">
          <SidebarActions />
        </div>
        <SidebarFooter className="border-t border-line">
          <SidebarUserFooter />
        </SidebarFooter>
      </div>
    </SidebarRoot>
  );
}
