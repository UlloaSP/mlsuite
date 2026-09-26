/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { useAtomValue } from "jotai";
import { DropdownMenu } from "radix-ui";
import { useLocation, useNavigate } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useSelectOrganization } from "@/features/workspace/api/workspace.mutations";
import { cx } from "@/shared/ui/cx";
import { sidebarPositionAtom } from "@/shared/ui/sidebar-position";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenu } from "./app-sidebar/SidebarMenu";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { useSidebar } from "./app-sidebar/SidebarContext";
import { SidebarMenuLink } from "./SidebarMenuLink";
import {
  SIDEBAR_MENU_ITEM,
  SIDEBAR_MENU_LABEL,
  SIDEBAR_MENU_SEPARATOR,
  SIDEBAR_MENU_TILE,
  sidebarMenuChevron,
  sidebarMenuContent,
  sidebarMenuTrigger,
} from "./sidebar-menu-styles";
import { isChildActive } from "./sidebar-navigation-support";
import { getWorkspaceLinks, isWorkspacePath } from "./workspace-navigation";

export function SidebarOrganizationHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useSidebar();
  const sidebarPosition = useAtomValue(sidebarPositionAtom);
  const { data: context } = useWorkspaceContext();
  const selectOrganization = useSelectOrganization();

  if (!context) {
    return null;
  }

  const collapsed = state === "collapsed";
  const organizationId = context.currentOrganization.id;
  const workspaceLinks = getWorkspaceLinks(context.permissions, organizationId);
  const currentPath = `${location.pathname}${location.search}`;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <SidebarMenuButton
              data-user-guide-item="workspace-switcher"
              isActive={isWorkspacePath(location.pathname, organizationId)}
              className={sidebarMenuTrigger(collapsed)}
              title={context.currentOrganization.name}
            >
              <span className={cx(SIDEBAR_MENU_TILE, "bg-fg text-fg-inverse")}>
                <Building2 size={16} />
              </span>
              <SidebarLabel className={collapsed ? "w-0 flex-none text-left" : "flex-1 text-left"}>
                <span className="block truncate text-sm font-semibold">
                  {context.currentOrganization.name}
                </span>
                <span className="block truncate text-xs font-normal text-fg-secondary">
                  {context.currentOrganization.slug}
                </span>
              </SidebarLabel>
              <ChevronsUpDown size={16} className={sidebarMenuChevron(collapsed)} />
            </SidebarMenuButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align={sidebarPosition === "right" ? "end" : "start"}
              side="bottom"
              sideOffset={8}
              collisionPadding={8}
              className={sidebarMenuContent(collapsed)}
            >
              {workspaceLinks.length > 0 ? (
                <>
                  <DropdownMenu.Label className={SIDEBAR_MENU_LABEL}>Workspace</DropdownMenu.Label>
                  <DropdownMenu.Group>
                    {workspaceLinks.map((link) => (
                      <SidebarMenuLink
                        key={link.to}
                        active={isChildActive(link, currentPath, location.pathname)}
                        icon={link.icon}
                        label={link.label}
                        to={link.to}
                      />
                    ))}
                  </DropdownMenu.Group>
                  <DropdownMenu.Separator className={SIDEBAR_MENU_SEPARATOR} />
                  <DropdownMenu.Label className={SIDEBAR_MENU_LABEL}>
                    Switch organization
                  </DropdownMenu.Label>
                </>
              ) : null}
              <DropdownMenu.Group className="app-scroll max-h-42 min-h-0 overflow-y-auto overscroll-contain">
                {context.organizations.map((organization) => (
                  <DropdownMenu.Item
                    key={organization.id}
                    className={cx(SIDEBAR_MENU_ITEM, "h-14 justify-between py-2.5")}
                    onSelect={() => {
                      void selectOrganization.mutateAsync(organization.id).then(() => {
                        void navigate("/home");
                      });
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{organization.name}</span>
                      <span className="block truncate text-xs text-fg-secondary">
                        {organization.slug}
                      </span>
                    </span>
                    {organization.id === context.currentOrganization.id ? (
                      <Check size={16} className="shrink-0" />
                    ) : null}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Group>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
