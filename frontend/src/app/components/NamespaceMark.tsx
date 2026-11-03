/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { OrganizationDto } from "@/shared/api/openapi.gen";
import { cx } from "@/shared/ui/cx";
import { OrganizationMark } from "@/shared/ui/OrganizationMark";

/**
 * How the switcher pictures where a member works: an organization by its mark, their own personal
 * account as the member themselves, whose avatar the API gives as the account's logo, or initials.
 */
export function NamespaceMark({
  className,
  fallbackClassName,
  iconSize,
  organization,
}: {
  className: string;
  fallbackClassName?: string;
  iconSize: number;
  organization: Pick<OrganizationDto, "kind" | "logoUrl" | "name">;
}) {
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
