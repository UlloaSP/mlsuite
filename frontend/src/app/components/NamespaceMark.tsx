/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { OrganizationDto } from "@/shared/api/openapi.gen";
import { cx } from "@/shared/ui/cx";
import { OrganizationMark } from "@/shared/ui/OrganizationMark";

/**
 * How the switcher pictures where a member works: an organization by its mark, their own personal
 * account as the member themselves, by avatar or initials. The switcher only ever lists the
 * member's own personal account, so `avatarUrl` is theirs.
 */
export function NamespaceMark({
  avatarUrl,
  className,
  fallbackClassName,
  iconSize,
  organization,
}: {
  avatarUrl: string | null | undefined;
  className: string;
  fallbackClassName?: string;
  iconSize: number;
  organization: Pick<OrganizationDto, "kind" | "logoUrl" | "name">;
}) {
  if (organization.kind === "TEAM") {
    return (
      <OrganizationMark
        className={className}
        fallbackClassName={fallbackClassName}
        iconSize={iconSize}
        logoUrl={organization.logoUrl}
      />
    );
  }
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        className={cx("shrink-0 object-cover", className)}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx(
        "grid shrink-0 place-items-center text-xs font-semibold",
        className,
        fallbackClassName,
      )}
    >
      {organization.name.slice(0, 2).toUpperCase()}
    </span>
  );
}
