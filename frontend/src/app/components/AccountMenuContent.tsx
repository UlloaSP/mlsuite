/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { LogOut } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useLocation } from "react-router";
import { useLogout } from "@/capabilities/workspace-context/session";
import { cx } from "@/shared/ui/cx";
import { ACCOUNT_LINKS, countLabel, isAccountLinkActive } from "./account-navigation";
import { SidebarMenuLink } from "./SidebarMenuLink";
import {
  SIDEBAR_MENU_ITEM,
  SIDEBAR_MENU_LABEL,
  SIDEBAR_MENU_SEPARATOR,
} from "./sidebar-menu-styles";

/** Profile, notifications, settings, and sign out, shared by sidebar and bar. */
export function AccountMenuContent({
  align,
  className,
  notificationCount,
  side,
}: {
  align: "start" | "end";
  className: string;
  notificationCount: number;
  side: "top" | "bottom";
}) {
  const location = useLocation();
  const { mutate: logout } = useLogout();

  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        side={side}
        sideOffset={8}
        collisionPadding={8}
        className={className}
      >
        <DropdownMenu.Label className={SIDEBAR_MENU_LABEL}>Account</DropdownMenu.Label>
        <DropdownMenu.Group>
          {ACCOUNT_LINKS.map((link) => (
            <SidebarMenuLink
              key={link.to}
              active={isAccountLinkActive(location.pathname, link.to)}
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
  );
}
