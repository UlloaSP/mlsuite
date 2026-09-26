/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Building2, ChevronsUpDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useLocation } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { cx } from "@/shared/ui/cx";
import type { SidebarPosition } from "@/shared/ui/sidebar-preferences";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenu } from "./app-sidebar/SidebarMenu";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { useSidebar } from "./app-sidebar/SidebarContext";
import { OrganizationMenuContent } from "./OrganizationMenuContent";
import {
  SIDEBAR_MENU_TILE,
  sidebarMenuChevron,
  sidebarMenuContent,
  sidebarMenuTrigger,
} from "./sidebar-menu-styles";
import { isWorkspacePath } from "./workspace-navigation";

export function SidebarOrganizationHeader({ side }: { side: SidebarPosition }) {
  const location = useLocation();
  const { state } = useSidebar();
  const { data: context } = useWorkspaceContext();

  if (!context) {
    return null;
  }

  const collapsed = state === "collapsed";
  const organization = context.currentOrganization;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <SidebarMenuButton
              data-user-guide-item="workspace-switcher"
              isActive={isWorkspacePath(location.pathname, organization.id)}
              className={sidebarMenuTrigger(collapsed)}
              title={organization.name}
            >
              <span className={cx(SIDEBAR_MENU_TILE, "bg-fg text-fg-inverse")}>
                <Building2 size={16} />
              </span>
              <SidebarLabel className={collapsed ? "w-0 flex-none text-left" : "flex-1 text-left"}>
                <span className="block truncate text-sm font-semibold">{organization.name}</span>
                <span className="block truncate text-xs font-normal text-fg-secondary">
                  {organization.slug}
                </span>
              </SidebarLabel>
              <ChevronsUpDown size={16} className={sidebarMenuChevron(collapsed)} />
            </SidebarMenuButton>
          </DropdownMenu.Trigger>
          <OrganizationMenuContent
            align={side === "right" ? "end" : "start"}
            side="bottom"
            context={context}
            className={sidebarMenuContent(collapsed)}
          />
        </DropdownMenu.Root>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
