/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Building2 } from "lucide-react";
import { apiUrl } from "@/shared/api/http";
import { cx } from "./cx";

/**
 * How an organization is pictured beside its name: its logo when it has one, otherwise the
 * building icon. The caller sizes and shapes the box; the name stays the accessible text next
 * to it, so the picture itself says nothing.
 */
export function OrganizationMark({
  className,
  fallbackClassName,
  iconSize,
  logoUrl,
}: {
  /** Size and radius of the box, e.g. "size-8 rounded-lg". */
  className: string;
  /** Surface of the box when the icon stands in for a logo. */
  fallbackClassName?: string;
  iconSize: number;
  logoUrl: string | null | undefined;
}) {
  if (logoUrl) {
    return (
      <img
        src={apiUrl(logoUrl)}
        alt=""
        data-organization-logo=""
        className={cx("shrink-0 object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx("grid shrink-0 place-items-center", className, fallbackClassName)}
    >
      <Building2 size={iconSize} />
    </span>
  );
}
