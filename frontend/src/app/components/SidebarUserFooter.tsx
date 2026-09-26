/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Bell, ChevronsUpDown, LogOut, ShieldCheck, User2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link } from "react-router";
import { useLogout, useUser } from "@/capabilities/workspace-context/session";
import { usePendingInvitations } from "@/features/workspace/api/workspace.queries";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenu } from "./app-sidebar/SidebarMenu";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { useSidebar } from "./app-sidebar/SidebarContext";

export function SidebarUserFooter() {
  const { state } = useSidebar();
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

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <SidebarMenuButton
              data-user-guide-item="user-menu"
              className={collapsed ? "mx-auto size-9 min-h-9 rounded-full p-0" : "min-h-13 rounded"}
              title={displayName}
            >
              <span className="relative shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={displayName}
                    className="size-9 rounded-full border border-line object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="grid size-9 place-items-center rounded-full bg-accent-subtle text-xs font-semibold text-accent-strong">
                    {initials}
                  </span>
                )}
                {notificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded bg-accent px-1 text-3xs font-bold leading-4 text-fg-inverse">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                ) : null}
              </span>
              <SidebarLabel className={collapsed ? "w-0 flex-none text-left" : "flex-1 text-left"}>
                <span className="block truncate text-sm font-semibold text-fg">{displayName}</span>
                <span className="block truncate text-xs font-normal text-fg-secondary">
                  {user.email}
                </span>
              </SidebarLabel>
              <ChevronsUpDown
                size={16}
                className={
                  collapsed
                    ? "w-0 shrink-0 scale-90 text-fg-muted opacity-0 transition-[opacity,transform] duration-200"
                    : "shrink-0 text-fg-muted opacity-100 transition-[opacity,transform] duration-200"
                }
              />
            </SidebarMenuButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              side="top"
              sideOffset={8}
              className="z-(--z-popover) min-w-[240px] rounded border border-line bg-surface p-2 text-fg shadow-hover"
            >
              <DropdownMenu.Item asChild>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium outline-none hover:bg-surface-muted focus:bg-surface-muted"
                >
                  <User2 size={16} />
                  Profile
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  to="/workspace"
                  className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium outline-none hover:bg-surface-muted focus:bg-surface-muted"
                >
                  <User2 size={16} />
                  Workspace
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  to="/notifications"
                  className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium outline-none hover:bg-surface-muted focus:bg-surface-muted"
                >
                  <Bell size={16} />
                  <span className="flex-1">Notifications</span>
                  {notificationCount > 0 ? (
                    <span className="rounded bg-accent px-1.5 py-0.5 text-3xs font-bold text-fg-inverse">
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </span>
                  ) : null}
                </Link>
              </DropdownMenu.Item>
              {user.systemRole === "SUPERADMIN" ? (
                <DropdownMenu.Item asChild>
                  <Link
                    to="/admin/users"
                    className="flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium outline-none hover:bg-surface-muted focus:bg-surface-muted"
                  >
                    <ShieldCheck size={16} />
                    Users
                  </Link>
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Separator className="my-2 h-px bg-line" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-3 rounded px-3 py-2.5 text-sm font-medium text-danger-fg outline-none hover:bg-danger-subtle focus:bg-danger-subtle"
                onSelect={() => logout()}
              >
                <LogOut size={16} />
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
