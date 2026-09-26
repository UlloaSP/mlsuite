/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { UserDTO } from "@/capabilities/workspace-context/session-api";
import { cx } from "@/shared/ui/cx";
import { countLabel } from "./account-navigation";
import { SIDEBAR_MENU_TILE } from "./sidebar-menu-styles";

export function AccountAvatar({
  displayName,
  notificationCount,
  user,
}: {
  displayName: string;
  notificationCount: number;
  user: Pick<UserDTO, "avatarUrl">;
}) {
  return (
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
          {displayName.slice(0, 2).toUpperCase()}
        </span>
      )}
      {notificationCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-3xs font-bold leading-4 text-on-accent">
          {countLabel(notificationCount)}
        </span>
      ) : null}
    </span>
  );
}
