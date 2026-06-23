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
  ChevronRight,
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
import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useUser } from "../../api/user/hooks";
import { useWorkspaceContext } from "../../api/workspace/hooks";
import { cx } from "./cx";
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
  children?: Array<{ to: string; icon: LucideIcon; label: string; exact?: boolean }>;
};

const INFRA_CHILDREN: NavigationItem["children"] = [
  { to: "/admin/infrastructure", icon: LayoutGrid, label: "Overview", exact: true },
  { to: "/admin/infrastructure?tab=services", icon: Server, label: "Services" },
  { to: "/admin/infrastructure?tab=logs", icon: List, label: "Logs" },
  { to: "/admin/infrastructure?tab=terminal", icon: SquareTerminal, label: "Terminal" },
  { to: "/admin/infrastructure?tab=alerts", icon: AlertTriangle, label: "Alerts" },
];

function splitHref(to: string) {
  const [pathname, search = ""] = to.split("?");
  return { pathname, search: search ? `?${search}` : "" };
}

function isChildActive(
  child: { to: string; exact?: boolean },
  currentPath: string,
  pathname: string,
) {
  const childHref = splitHref(child.to);
  const childPath = `${childHref.pathname}${childHref.search}`;

  if (child.exact || childHref.search) {
    return currentPath === childPath;
  }

  return pathname === childHref.pathname || pathname.startsWith(`${childHref.pathname}/`);
}

export function SidebarNavigation() {
  const location = useLocation();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const { data: user } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const permissions = workspace?.permissions;
  const currentPath = `${location.pathname}${location.search}`;
  const currentOrganizationPath = workspace
    ? `/workspace/organizations/${workspace.currentOrganization.id}`
    : undefined;
  const workspaceChildren: NavigationItem["children"] = [
    { to: "/workspace", icon: LayoutGrid, label: "Overview", exact: true },
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
  const isParentActive = (item: NavigationItem) =>
    item.activeWhen?.(location.pathname) ??
    (location.pathname === item.to || location.pathname.startsWith(`${item.to}/`));

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu aria-label="Main navigation">
          {navigation.map((item) => {
            const active = isParentActive(item);
            const hasChildren = Boolean(item.children?.length);
            const open = openItems[item.to] ?? active;
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.to}>
                {hasChildren ? (
                  <SidebarMenuButton
                    aria-expanded={open}
                    isActive={active}
                    onClick={() =>
                      setOpenItems((current) => ({
                        ...current,
                        [item.to]: !(current[item.to] ?? active),
                      }))
                    }
                    title={item.label}
                    type="button"
                  >
                    <Icon size={18} className="shrink-0" />
                    <SidebarLabel className="truncate">{item.label}</SidebarLabel>
                    <ChevronRight
                      size={15}
                      className={cx(
                        "ml-auto shrink-0 transition-transform duration-200",
                        open && "rotate-90",
                      )}
                    />
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild isActive={active} title={item.label}>
                    <Link to={item.to} viewTransition>
                      <Icon size={18} className="shrink-0" />
                      <SidebarLabel className="truncate">{item.label}</SidebarLabel>
                    </Link>
                  </SidebarMenuButton>
                )}
                {item.children ? (
                  <div
                    className={cx(
                      "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <SidebarMenuSub>
                        {item.children.map((child) => {
                          const childActive = isChildActive(child, currentPath, location.pathname);
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
                    </div>
                  </div>
                ) : null}
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
