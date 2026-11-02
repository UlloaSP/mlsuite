/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import { apiUrl } from "@/shared/api/http";
import { personInitials } from "@/shared/lib/person-initials";
import { cx } from "./cx";

/**
 * How a person is pictured beside their name: their avatar, or their initials without one. The
 * caller sizes and shapes the box; the name stays the accessible text next to it, so the picture
 * itself says nothing. A private person's avatar is not served to everyone, so a picture that
 * cannot be read gives way to the initials too.
 */
export function PersonAvatar({
  avatarUrl,
  className,
  fallbackClassName = "bg-accent-subtle text-accent-strong",
  name,
}: {
  avatarUrl: string | null | undefined;
  /** Size and radius of the box, e.g. "size-8 rounded-full", and the size of the initials. */
  className: string;
  /** Surface of the box when initials stand in for a picture. */
  fallbackClassName?: string;
  name: string;
}) {
  const [unreadable, setUnreadable] = useState<string | null>(null);
  if (avatarUrl && unreadable !== avatarUrl) {
    return (
      <img
        src={apiUrl(avatarUrl)}
        alt=""
        className={cx("shrink-0 object-cover", className)}
        onError={() => setUnreadable(avatarUrl)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cx("grid shrink-0 place-items-center font-semibold", className, fallbackClassName)}
    >
      {personInitials(name)}
    </span>
  );
}
