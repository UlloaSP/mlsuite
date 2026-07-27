/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  Blocks,
  BrainCircuit,
  Building2,
  ChevronRight,
  ClipboardList,
  KeyRound,
  LayoutGrid,
  Mail,
  MessageSquareText,
  ServerCog,
  ShieldCheck,
  Settings,
  Users,
} from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { isTypingTarget, shortcutDigit } from "@/app/utils/keyboard-shortcuts";
import { cx } from "@/shared/ui/cx";
import { Kbd } from "./Kbd";
import { getActiveSchemaPath, getSchemaNavigationChildren } from "./schema-sidebar-navigation";
import { INFRA_CHILDREN, isChildActive, type NavigationItem } from "./sidebar-navigation-support";
import { SidebarGroup } from "./app-sidebar/SidebarGroup";
import { SidebarGroupContent } from "./app-sidebar/SidebarGroupContent";
import { SidebarGroupLabel } from "./app-sidebar/SidebarGroupLabel";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenu } from "./app-sidebar/SidebarMenu";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { SidebarMenuSub } from "./app-sidebar/SidebarMenuSub";
import { SidebarMenuSubButton } from "./app-sidebar/SidebarMenuSubButton";
import { SidebarMenuSubItem } from "./app-sidebar/SidebarMenuSubItem";
import { useSidebar } from "./app-sidebar/SidebarContext";

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
  const activeSchemaPath = getActiveSchemaPath(location.pathname);
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
      ? [
          {
            to: activeSchemaPath ?? "/schemas",
            icon: ClipboardList,
            label: "Schemas",
            children: getSchemaNavigationChildren(activeSchemaPath),
          },
        ]
      : []),
    ...(permissions?.canViewModels
      ? [{ to: "/inferences", icon: BrainCircuit, label: "Inferences" }]
      : []),
    ...(permissions?.canViewPlugins ? [{ to: "/plugins", icon: Blocks, label: "Plugins" }] : []),
    ...(permissions?.canReview || permissions?.canManageReviews
      ? [{ to: "/review", icon: MessageSquareText, label: "Review" }]
      : []),
    ...(user?.systemRole === "SUPERADMIN"
      ? [
          { to: "/admin/users", icon: ShieldCheck, label: "Users" },
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
    if (event.key === "Alt" && state !== "collapsed" && !isTypingTarget(event.target)) {
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

            return (
              <SidebarMenuItem key={item.to}>
                {hasChildren ? (
                  <SidebarMenuButton
                    aria-expanded={open}
                    aria-keyshortcuts={`Alt+${String(index + 1)}`}
                    isActive={active}
                    onClick={() => {
                      if (state === "collapsed") {
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
                    {state !== "collapsed" ? (
                      <Kbd
                        aria-hidden={!showShortcutHints}
                        className={cx("ml-auto shrink-0", !showShortcutHints && "invisible")}
                      >
                        {String(index + 1)}
                      </Kbd>
                    ) : null}
                    {state !== "collapsed" ? (
                      <ChevronRight
                        size={15}
                        className={cx(
                          "shrink-0 transition-transform duration-200",
                          !showShortcutHints && "ml-auto",
                          open && "rotate-90",
                        )}
                      />
                    ) : null}
                  </SidebarMenuButton>
                ) : (
                  <SidebarMenuButton asChild isActive={active} title={item.label}>
                    <Link
                      aria-keyshortcuts={`Alt+${String(index + 1)}`}
                      to={item.to}
                      viewTransition
                    >
                      <Icon size={18} className="shrink-0" />
                      <SidebarLabel className="truncate">{item.label}</SidebarLabel>
                      {state !== "collapsed" ? (
                        <Kbd
                          aria-hidden={!showShortcutHints}
                          className={cx("ml-auto shrink-0", !showShortcutHints && "invisible")}
                        >
                          {String(index + 1)}
                        </Kbd>
                      ) : null}
                    </Link>
                  </SidebarMenuButton>
                )}
                {item.children && state !== "collapsed" ? (
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
                                    aria-hidden={!showShortcutHints}
                                    className={cx(
                                      "ml-auto h-4 min-w-4 shrink-0 text-[0.62rem]",
                                      !showShortcutHints && "invisible",
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
