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

export function Sidebar({ side }: { side: SidebarPosition }) {
  const variant = useAtomValue(sidebarStyleAtom);

  return (
    <SidebarRoot data-user-guide="sidebar" side={side} variant={variant}>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div className="shrink-0 p-3">
          <SidebarBrand side={side} />
          <SidebarOrganizationHeader side={side} />
        </div>
        <div className="app-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2">
          <SidebarNavigation />
        </div>
        <div className="shrink-0 border-t border-line px-3 py-2">
          <SidebarActions />
        </div>
        <div className="shrink-0 border-t border-line p-3">
          <SidebarUserFooter side={side} />
        </div>
      </div>
    </SidebarRoot>
  );
}
