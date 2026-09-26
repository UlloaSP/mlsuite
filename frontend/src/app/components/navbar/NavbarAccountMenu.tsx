/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { DropdownMenu } from "radix-ui";
import { useLocation } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { usePendingInvitations } from "@/features/workspace/api/workspace.queries";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { AccountAvatar } from "@/app/components/AccountAvatar";
import { AccountMenuContent } from "@/app/components/AccountMenuContent";
import { isAccountPath } from "@/app/components/account-navigation";
import { sidebarMenuContent } from "@/app/components/sidebar-menu-styles";

export function NavbarAccountMenu({ menuSide }: { menuSide: "top" | "bottom" }) {
  const location = useLocation();
  const { data: user } = useUser();
  const { data: notifications = [] } = usePendingInvitations();

  if (!user) {
    return null;
  }

  const displayName = user.userName || user.fullName || "Guest";

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        data-user-guide-item="user-menu"
        title={displayName}
        aria-label={`Account: ${displayName}`}
        className={cx(
          "grid size-10 shrink-0 place-items-center rounded-xl transition",
          isAccountPath(location.pathname) ? "bg-accent-subtle" : "hover:bg-surface-hover",
          FOCUS_RING,
        )}
      >
        <AccountAvatar
          displayName={displayName}
          notificationCount={notifications.length}
          user={user}
        />
      </DropdownMenu.Trigger>
      <AccountMenuContent
        align="end"
        side={menuSide}
        notificationCount={notifications.length}
        className={sidebarMenuContent(true)}
      />
    </DropdownMenu.Root>
  );
}
