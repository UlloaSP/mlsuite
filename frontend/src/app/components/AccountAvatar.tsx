/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "@/shared/ui/cx";
import { PersonAvatar } from "@/shared/ui/PersonAvatar";
import { countLabel } from "./account-navigation";
import { SIDEBAR_MENU_TILE } from "./sidebar-menu-styles";
import type { UserDto } from "@/shared/api/openapi.gen";

export function AccountAvatar({
  displayName,
  notificationCount,
  user,
}: {
  displayName: string;
  notificationCount: number;
  user: Pick<UserDto, "avatarUrl">;
}) {
  return (
    <span className="relative shrink-0">
      <PersonAvatar
        avatarUrl={user.avatarUrl}
        className={cx(SIDEBAR_MENU_TILE, "text-xs")}
        name={displayName}
      />
      {notificationCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-3xs font-bold leading-4 text-on-accent">
          {countLabel(notificationCount)}
        </span>
      ) : null}
    </span>
  );
}
