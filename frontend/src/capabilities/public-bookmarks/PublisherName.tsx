/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppLink } from "@/shared/ui/AppLink";
import { profileLink } from "@/shared/lib/profile-link";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

/** Who published a bookmark: a link to their profile, for a person who keeps one public. */
export function PublisherName({ handle, name }: { handle: string | null; name: string }) {
  if (!handle) return <span className="truncate">{name}</span>;
  return (
    <AppLink
      {...profileLink(handle)}
      className={cx("relative z-10 truncate rounded-sm hover:text-fg hover:underline", FOCUS_RING)}
    >
      {name}
    </AppLink>
  );
}
