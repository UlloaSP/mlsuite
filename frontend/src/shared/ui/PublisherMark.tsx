/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { cx } from "./cx";
import { OrganizationMark } from "./OrganizationMark";

/**
 * Who a thing belongs to, beside their name, where any account on the instance may appear: a
 * person's personal account by their avatar, which the API gives as the account's logo, or their
 * initials, an organization by its mark.
 */
export function PublisherMark({
  className,
  iconSize,
  kind,
  logoUrl,
  name,
}: {
  /** Size and radius of the box, e.g. "size-5 rounded-sm". */
  className: string;
  iconSize: number;
  kind: "PERSONAL" | "TEAM";
  logoUrl: string | null | undefined;
  name: string;
}) {
  return (
    <OrganizationMark
      className={cx(className, kind === "PERSONAL" && "rounded-full!")}
      fallbackClassName={
        kind === "PERSONAL" ? "bg-surface-muted text-3xs text-fg-secondary" : undefined
      }
      iconSize={iconSize}
      logoUrl={logoUrl}
      personalName={kind === "PERSONAL" ? name : undefined}
    />
  );
}
