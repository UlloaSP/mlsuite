/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Blocks,
  BrainCircuit,
  Building2,
  ClipboardList,
  KeyRound,
  LayoutGrid,
  List,
  Mail,
  Server,
  ServerCog,
  ShieldCheck,
  SquareTerminal,
  Settings,
  Users,
} from "lucide-react";
import { Link, useLocation } from "react-router";
import { useUser } from "../../api/user/hooks";
import { useWorkspaceContext } from "../../api/workspace/hooks";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./app-sidebar";

type NavigationItem = {
  to: string;
  icon: LucideIcon;
  label: string;
  activeWhen?: (pathname: string) => boolean;
  children?: Array<{ to: string; icon: LucideIcon; label: string }>;
};

const INFRA_CHILDREN: NavigationItem["children"] = [
  { to: "/admin/infrastructure", icon: LayoutGrid, label: "Overview" },
  { to: "/admin/infrastructure?tab=services", icon: Server, label: "Services" },
  { to: "/admin/infrastructure?tab=logs", icon: List, label: "Logs" },
  { to: "/admin/infrastructure?tab=terminal", icon: SquareTerminal, label: "Terminal" },
  { to: "/admin/infrastructure?tab=alerts", icon: AlertTriangle, label: "Alerts" },
];

export function SidebarNavigation() {
  const location = useLocation();
  const { data: user } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const permissions = workspace?.permissions;
  const currentPath = `${location.pathname}${location.search}`;
  const currentOrganizationPath = workspace
    ? `/workspace/organizations/${workspace.currentOrganization.id}`
    : undefined;
  const workspaceChildren: NavigationItem["children"] = [
    { to: "/workspace", icon: LayoutGrid, label: "Overview" },
    ...(permissions?.canViewTeams && currentOrganizationPath
      ? [{ to: `${currentOrganizationPath}/teams`, icon: Users, label: "Teams" }]
      : []),
    ...(permissions?.canViewMembers && currentOrganizationPath
      ? [{ to: `${currentOrganizationPath}/members`, icon: Users, label: "Members" }]
      : []),
    ...(permissions?.canViewInvitations && currentOrganizationPath
      ? [{ to: `${currentOrganizationPath}/invitations`, icon: Mail, label: "Invitations" }]
      : []),
    ...(permissions?.canViewMembers && currentOrganizationPath
      ? [{ to: `${currentOrganizationPath}/roles`, icon: KeyRound, label: "Roles & Templates" }]
      : []),
    ...(permissions?.canViewOrganization && currentOrganizationPath
      ? [{ to: `${currentOrganizationPath}/settings`, icon: Settings, label: "Settings" }]
      : []),
  ];
  const navigation: NavigationItem[] = [
    ...(permissions?.canViewWorkspace
      ? [
          {
            to: "/workspace",
            icon: Building2,
            label: "Workspace",
            children: workspaceChildren,
            activeWhen: (pathname: string) =>
              pathname === "/workspace" ||
              Boolean(
                currentOrganizationPath && pathname.startsWith(`${currentOrganizationPath}/`),
              ),
          },
        ]
      : []),
    ...(user?.systemRole === "SUPERADMIN"
      ? [
          {
            to: "/workspace/organizations",
            icon: Building2,
            label: "Organizations",
            activeWhen: (pathname: string) =>
              pathname === "/workspace/organizations" ||
              pathname === "/workspace/organizations/create" ||
              Boolean(
                currentOrganizationPath &&
                pathname.startsWith("/workspace/organizations/") &&
                !pathname.startsWith(currentOrganizationPath),
              ),
          },
        ]
      : []),
    ...(permissions?.canViewModels ? [{ to: "/models", icon: BrainCircuit, label: "Models" }] : []),
    ...(permissions?.canViewModels
      ? [{ to: "/schemas", icon: ClipboardList, label: "Schemas" }]
      : []),
    ...(permissions?.canViewPlugins ? [{ to: "/plugins", icon: Blocks, label: "Plugins" }] : []),
    ...(user?.systemRole === "SUPERADMIN"
      ? [
          { to: "/admin/users", icon: ShieldCheck, label: "Admin" },
          {
            to: "/admin/infrastructure",
            icon: ServerCog,
            label: "Infra",
            children: INFRA_CHILDREN,
          },
        ]
      : []),
  ];

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu aria-label="Main navigation">
          {navigation.map((item) => {
            const active =
              item.activeWhen?.(location.pathname) ??
              (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.to}>
                <SidebarMenuButton asChild isActive={active} title={item.label}>
                  <Link to={item.to} viewTransition>
                    <Icon size={18} className="shrink-0" />
                    <SidebarLabel className="truncate">{item.label}</SidebarLabel>
                  </Link>
                </SidebarMenuButton>
                {item.children && active ? (
                  <SidebarMenuSub>
                    {item.children.map((child) => {
                      const childActive =
                        currentPath === child.to ||
                        location.pathname.startsWith(`${child.to}/`) ||
                        (child.to === item.to && currentPath === `${item.to}?tab=overview`);
                      const ChildIcon = child.icon;

                      return (
                        <SidebarMenuSubItem key={child.to}>
                          <SidebarMenuSubButton asChild isActive={childActive}>
                            <Link to={child.to} viewTransition>
                              <ChildIcon size={14} className="shrink-0" />
                              <span className="truncate">{child.label}</span>
                            </Link>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      );
                    })}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
