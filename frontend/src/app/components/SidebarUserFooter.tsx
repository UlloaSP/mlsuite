/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronsUpDown, LogOut, ShieldCheck, User2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Link } from "react-router";
import { useLogout, useUser } from "../../api/user/hooks";
import {
  SidebarLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "./app-sidebar";

export function SidebarUserFooter() {
  const { state } = useSidebar();
  const { data: user } = useUser();
  const { mutate: logout } = useLogout();

  if (!user) {
    return null;
  }

  const collapsed = state === "collapsed";
  const displayName = user.userName || user.fullName || "Guest";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <SidebarMenuButton
              className={
                collapsed ? "mx-auto size-9 min-h-9 rounded-full p-0" : "min-h-13 rounded-xl"
              }
              title={displayName}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={displayName}
                  className="size-9 shrink-0 rounded-full border border-[var(--border-soft)] object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent-quiet)] text-xs font-semibold text-[var(--accent-primary-strong)]">
                  {initials}
                </span>
              )}
              <SidebarLabel className={collapsed ? "w-0 flex-none text-left" : "flex-1 text-left"}>
                <span className="block truncate text-sm font-semibold text-[var(--text-primary)]">
                  {displayName}
                </span>
                <span className="block truncate text-xs font-normal text-[var(--text-secondary)]">
                  {user.email}
                </span>
              </SidebarLabel>
              <ChevronsUpDown
                size={16}
                className={
                  collapsed
                    ? "w-0 shrink-0 scale-90 text-[var(--text-muted)] opacity-0 transition-[opacity,transform] duration-200"
                    : "shrink-0 text-[var(--text-muted)] opacity-100 transition-[opacity,transform] duration-200"
                }
              />
            </SidebarMenuButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="start"
              side="top"
              sideOffset={8}
              className="z-[1000] min-w-[240px] rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 text-[var(--text-primary)] shadow-[var(--shadow-hover)]"
            >
              <DropdownMenu.Item asChild>
                <Link
                  to="/profile"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)]"
                >
                  <User2 size={16} />
                  Profile
                </Link>
              </DropdownMenu.Item>
              <DropdownMenu.Item asChild>
                <Link
                  to="/workspace"
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)]"
                >
                  <User2 size={16} />
                  Workspace
                </Link>
              </DropdownMenu.Item>
              {user.systemRole === "SUPERADMIN" ? (
                <DropdownMenu.Item asChild>
                  <Link
                    to="/admin/users"
                    className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium outline-none hover:bg-[var(--surface-muted)] focus:bg-[var(--surface-muted)]"
                  >
                    <ShieldCheck size={16} />
                    Admin
                  </Link>
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Separator className="my-2 h-px bg-[var(--border-soft)]" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--danger-text)] outline-none hover:bg-[var(--danger-quiet)] focus:bg-[var(--danger-quiet)]"
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
