/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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
import { useEffect, useEffectEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useUser } from "../../api/user/hooks";
import { useWorkspaceContext } from "../../api/workspace/hooks";
import { isTypingTarget, shortcutDigit } from "../utils/keyboard-shortcuts";
import { cx } from "./cx";
import { Kbd } from "./Kbd";
import { isChildActive, type NavigationItem } from "./sidebar-navigation-support";
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
  useSidebar,
} from "./app-sidebar";

const INFRA_CHILDREN: NavigationItem["children"] = [
  { to: "/admin/infrastructure", icon: LayoutGrid, label: "Overview", exact: true },
  { to: "/admin/infrastructure?tab=services", icon: Server, label: "Services" },
  { to: "/admin/infrastructure?tab=logs", icon: List, label: "Logs" },
  { to: "/admin/infrastructure?tab=terminal", icon: SquareTerminal, label: "Terminal" },
  { to: "/admin/infrastructure?tab=alerts", icon: AlertTriangle, label: "Alerts" },
];

export function SidebarNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openItem, setOpenItem] = useState<string | null | undefined>(undefined);
  const [showShortcutHints, setShowShortcutHints] = useState(false);
  const { state } = useSidebar();
  const { data: user } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const permissions = workspace?.permissions;
  const currentPath = `${location.pathname}${location.search}`;
  const collapsed = state === "collapsed";
  const showExpandedShortcutHints = showShortcutHints && !collapsed;
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
  const getShortcutChildren = () => {
    const parent =
      openItem === undefined
        ? navigation.find((item) => item.children?.length && isParentActive(item))
        : navigation.find((item) => item.to === openItem && item.children?.length);
    return parent?.children ?? [];
  };
  const handleWindowKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Alt" && !collapsed && !isTypingTarget(event.target)) {
      setShowShortcutHints(true);
    }

    if (!event.altKey || event.ctrlKey || event.metaKey || isTypingTarget(event.target)) {
      return;
    }

    const digit = shortcutDigit(event);
    if (!digit) return;

    const target = event.shiftKey ? getShortcutChildren()[digit - 1] : navigation[digit - 1];
    if (!target) return;

    event.preventDefault();
    void navigate(target.to, { viewTransition: true });
  });

  useEffect(() => {
    const hide = () => setShowShortcutHints(false);
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") hide();
    };

    window.addEventListener("keydown", handleWindowKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", hide);
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", hide);
    };
  }, []);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Menu</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu aria-label="Main navigation">
          {navigation.map((item, index) => {
            const active = isParentActive(item);
            const hasChildren = Boolean(item.children?.length);
            const open = openItem === undefined ? active : openItem === item.to;
            const Icon = item.icon;
            const shortcut = String(index + 1);

            return (
              <SidebarMenuItem key={item.to}>
                {hasChildren ? (
                  <SidebarMenuButton
                    aria-expanded={open}
                    aria-keyshortcuts={`Alt+${shortcut}`}
                    isActive={active}
                    onClick={() => {
                      if (collapsed) {
                        void navigate(item.children?.[0]?.to ?? item.to, { viewTransition: true });
                        return;
                      }
                      setOpenItem((current) => (current === item.to ? null : item.to));
                    }}
                    title={item.label}
                    type="button"
                  >
                    <Icon size={18} className="shrink-0" />
                    <SidebarLabel className="truncate">{item.label}</SidebarLabel>
                    {!collapsed ? (
                      <Kbd
                        aria-hidden={!showExpandedShortcutHints}
                        className={cx(
                          "ml-auto shrink-0",
                          !showExpandedShortcutHints && "invisible",
                        )}
                      >
                        {shortcut}
                      </Kbd>
                    ) : null}
                    {!collapsed ? (
                      <ChevronRight
                        size={15}
                        className={cx(
                          "shrink-0 transition-transform duration-200",
                          !showExpandedShortcutHints && "ml-auto",
                          open && "rotate-90",
                        )}
                      />
                    ) : null}
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild isActive={active} title={item.label}>
                    <Link aria-keyshortcuts={`Alt+${shortcut}`} to={item.to} viewTransition>
                      <Icon size={18} className="shrink-0" />
                      <SidebarLabel className="truncate">{item.label}</SidebarLabel>
                      {!collapsed ? (
                        <Kbd
                          aria-hidden={!showExpandedShortcutHints}
                          className={cx(
                            "ml-auto shrink-0",
                            !showExpandedShortcutHints && "invisible",
                          )}
                        >
                          {shortcut}
                        </Kbd>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                )}
                {item.children && !collapsed ? (
                  <div
                    className={cx(
                      "grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
                      open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <SidebarMenuSub>
                        {item.children.map((child, childIndex) => {
                          const childActive = isChildActive(child, currentPath, location.pathname);
                          const ChildIcon = child.icon;
                          const childShortcut = String(childIndex + 1);

                          return (
                            <SidebarMenuSubItem key={child.to}>
                              <SidebarMenuSubButton asChild isActive={childActive}>
                                <Link
                                  aria-keyshortcuts={`Alt+Shift+${childShortcut}`}
                                  to={child.to}
                                  viewTransition
                                >
                                  <ChildIcon size={14} className="shrink-0" />
                                  <span className="truncate">{child.label}</span>
                                  <Kbd
                                    aria-hidden={!showExpandedShortcutHints}
                                    className={cx(
                                      "ml-auto h-4 min-w-4 shrink-0 text-[0.62rem]",
                                      !showExpandedShortcutHints && "invisible",
                                    )}
                                  >
                                    {childShortcut}
                                  </Kbd>
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
