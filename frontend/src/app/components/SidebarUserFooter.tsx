/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronsUpDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useLocation } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { usePendingInvitations } from "@/features/workspace/api/workspace.queries";
import type { SidebarPosition } from "@/shared/ui/sidebar-preferences";
import { SidebarLabel } from "./app-sidebar/SidebarLabel";
import { SidebarMenu } from "./app-sidebar/SidebarMenu";
import { SidebarMenuButton } from "./app-sidebar/SidebarMenuButton";
import { SidebarMenuItem } from "./app-sidebar/SidebarMenuItem";
import { useSidebar } from "./app-sidebar/SidebarContext";
import { AccountAvatar } from "./AccountAvatar";
import { AccountMenuContent } from "./AccountMenuContent";
import { isAccountPath } from "./account-navigation";
import { sidebarMenuChevron, sidebarMenuContent, sidebarMenuTrigger } from "./sidebar-menu-styles";

export function SidebarUserFooter({ side }: { side: SidebarPosition }) {
  const location = useLocation();
  const { state } = useSidebar();
  const { data: user } = useUser();
  const { data: notifications = [] } = usePendingInvitations();

  if (!user) {
    return null;
  }

  const collapsed = state === "collapsed";
  const displayName = user.fullName || user.userName || "Guest";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <SidebarMenuButton
              data-user-guide-item="user-menu"
              isActive={isAccountPath(location.pathname)}
              className={sidebarMenuTrigger(collapsed)}
              title={displayName}
            >
              <AccountAvatar
                displayName={displayName}
                notificationCount={notifications.length}
                user={user}
              />
              <SidebarLabel className={collapsed ? "w-0 flex-none text-left" : "flex-1 text-left"}>
                <span className="block truncate text-sm font-semibold">{displayName}</span>
                <span className="block truncate text-xs font-normal text-fg-secondary">
                  {user.email}
                </span>
              </SidebarLabel>
              <ChevronsUpDown size={16} className={sidebarMenuChevron(collapsed)} />
            </SidebarMenuButton>
          </DropdownMenu.Trigger>
          <AccountMenuContent
            align={side === "right" ? "end" : "start"}
            side="top"
            notificationCount={notifications.length}
            className={sidebarMenuContent(collapsed)}
          />
        </DropdownMenu.Root>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
