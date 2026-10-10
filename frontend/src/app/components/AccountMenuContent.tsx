/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { LogOut } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useLocation } from "react-router";
import { useLogout } from "@/capabilities/workspace-context/session";
import { useUnsavedInferences } from "@/features/schemas/lib/inference-session-store";
import { cx } from "@/shared/ui/cx";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import { ACCOUNT_LINKS, countLabel, isAccountLinkActive } from "./account-navigation";
import { EXPLORE_PATH } from "./explore-navigation";
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
  align: "start" | "center" | "end";
  className: string;
  notificationCount: number;
  side: "top" | "bottom";
}) {
  const location = useLocation();
  const { mutate: logout } = useLogout(EXPLORE_PATH);
  const unsaved = useUnsavedInferences();
  const actionDialog = useActionDialog();
  // Signing out loads a new document. Asked here, the browser's own leave-page prompt never
  // appears: the runs it would warn about are already given up.
  const signOut = async () => {
    if (unsaved.count > 0) {
      const confirmed = await actionDialog.confirm({
        title: "Sign out and discard the session?",
        description: `${unsaved.count} unsaved inference${unsaved.count === 1 ? " is" : "s are"} lost. Saved ones stay in the history.`,
        confirmLabel: "Discard and sign out",
        danger: true,
      });
      if (!confirmed) return;
      unsaved.discard();
    }
    logout();
  };

  return (
    <>
      {/* Beside the menu, not inside it: the menu closes as the dialog opens. */}
      {actionDialog.dialog}
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
            onSelect={() => void signOut()}
          >
            <LogOut size={15} className="shrink-0" />
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </>
  );
}
