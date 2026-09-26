/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Bell, ChevronsUpDown, LogOut, Settings, User2 } from "lucide-react";
import { useAtomValue } from "jotai";
import { DropdownMenu } from "radix-ui";
import { useLocation } from "react-router";
import { useLogout, useUser } from "@/capabilities/workspace-context/session";
import { usePendingInvitations } from "@/features/workspace/api/workspace.queries";
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

const ACCOUNT_LINKS = [
  { to: "/profile", icon: User2, label: "Profile" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

const countLabel = (count: number) => (count > 9 ? "9+" : String(count));

export function SidebarUserFooter() {
  const location = useLocation();
  const { state } = useSidebar();
  const sidebarPosition = useAtomValue(sidebarPositionAtom);
  const { data: user } = useUser();
  const { data: notifications = [] } = usePendingInvitations();
  const { mutate: logout } = useLogout();

  if (!user) {
    return null;
  }

  const collapsed = state === "collapsed";
  const displayName = user.userName || user.fullName || "Guest";
  const initials = displayName.slice(0, 2).toUpperCase();
  const notificationCount = notifications.length;
  const isLinkActive = (to: string) =>
    location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <SidebarMenuButton
              data-user-guide-item="user-menu"
              isActive={ACCOUNT_LINKS.some(({ to }) => isLinkActive(to))}
              className={sidebarMenuTrigger(collapsed)}
              title={displayName}
            >
              <span className="relative shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className={cx(SIDEBAR_MENU_TILE, "border border-line object-cover")}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span
                    className={cx(
                      SIDEBAR_MENU_TILE,
                      "bg-accent-subtle text-xs font-semibold text-accent-strong",
                    )}
                  >
                    {initials}
                  </span>
                )}
                {notificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-3xs font-bold leading-4 text-on-accent">
                    {countLabel(notificationCount)}
                  </span>
                ) : null}
              </span>
              <SidebarLabel className={collapsed ? "w-0 flex-none text-left" : "flex-1 text-left"}>
                <span className="block truncate text-sm font-semibold">{displayName}</span>
                <span className="block truncate text-xs font-normal text-fg-secondary">
                  {user.email}
                </span>
              </SidebarLabel>
              <ChevronsUpDown size={16} className={sidebarMenuChevron(collapsed)} />
            </SidebarMenuButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align={sidebarPosition === "right" ? "end" : "start"}
              side="top"
              sideOffset={8}
              collisionPadding={8}
              className={sidebarMenuContent(collapsed)}
            >
              <DropdownMenu.Label className={SIDEBAR_MENU_LABEL}>Account</DropdownMenu.Label>
              <DropdownMenu.Group>
                {ACCOUNT_LINKS.map((link) => (
                  <SidebarMenuLink
                    key={link.to}
                    active={isLinkActive(link.to)}
                    icon={link.icon}
                    label={link.label}
                    to={link.to}
                    trailing={
                      link.to === "/notifications" && notificationCount > 0 ? (
                        <span className="rounded-full bg-accent px-1.5 py-0.5 text-3xs font-bold text-on-accent">
                          {countLabel(notificationCount)}
                        </span>
                      ) : undefined
                    }
                  />
                ))}
              </DropdownMenu.Group>
              <DropdownMenu.Separator className={SIDEBAR_MENU_SEPARATOR} />
              <DropdownMenu.Item
                className={cx(
                  SIDEBAR_MENU_ITEM,
                  "h-9 text-danger-fg hover:bg-danger-subtle focus:bg-danger-subtle",
                )}
                onSelect={() => logout()}
              >
                <LogOut size={15} className="shrink-0" />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
