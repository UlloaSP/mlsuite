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
  if (organization.kind === "PERSONAL" && avatarUrl) {
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
    <OrganizationMark
      className={className}
      fallbackClassName={cx("text-xs", fallbackClassName)}
      iconSize={iconSize}
      logoUrl={organization.logoUrl}
      personalName={organization.kind === "PERSONAL" ? organization.name : undefined}
    />
  );
}
