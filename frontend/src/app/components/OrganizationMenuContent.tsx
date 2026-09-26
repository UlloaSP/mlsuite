/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useLocation, useNavigate } from "react-router";
import type { WorkspaceContextDto } from "@/capabilities/workspace-context/workspace-context.types";
import { useSelectOrganization } from "@/features/workspace/api/workspace.mutations";
import { cx } from "@/shared/ui/cx";
import { SidebarMenuLink } from "./SidebarMenuLink";
import {
  SIDEBAR_MENU_ITEM,
  SIDEBAR_MENU_LABEL,
  SIDEBAR_MENU_SEPARATOR,
} from "./sidebar-menu-styles";
import { isChildActive } from "./sidebar-navigation-support";
import { getWorkspaceLinks } from "./workspace-navigation";

/** Active organization pages and the organization switcher, shared by sidebar and bar. */
export function OrganizationMenuContent({
  align,
  className,
  context,
  side,
}: {
  align: "start" | "end";
  className: string;
  context: WorkspaceContextDto;
  side: "top" | "bottom";
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const selectOrganization = useSelectOrganization();
  const workspaceLinks = getWorkspaceLinks(context.permissions, context.currentOrganization.id);
  const currentPath = `${location.pathname}${location.search}`;

  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={8}
        className={className}
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
  );
}
