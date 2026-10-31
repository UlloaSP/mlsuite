/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { profilePath } from "@/shared/lib/profile-path";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

/** Who published a bookmark: a link to their profile, for a person who keeps one public. */
export function PublisherName({ handle, name }: { handle: string | null; name: string }) {
  if (!handle) return <span className="truncate">{name}</span>;
  return (
    <Link
      to={profilePath(handle)}
      className={cx("relative z-10 truncate rounded-sm hover:text-fg hover:underline", FOCUS_RING)}
    >
      {name}
    </Link>
  );
}
