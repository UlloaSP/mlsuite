/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ComponentProps } from "react";
import { ProfileBookmarks } from "./ProfileBookmarks";
import { ProfileFacts } from "./ProfileFacts";
import type { PublicProfileDto } from "@/shared/api/openapi.gen";

/** A profile as anyone reads it: the person beside what they publish, stacked on narrow screens. */
export function ProfileView({
  bookmarks,
  profile,
}: {
  bookmarks: ComponentProps<typeof ProfileBookmarks>["bookmarks"];
  profile: PublicProfileDto;
}) {
  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <ProfileFacts profile={profile} />
      <ProfileBookmarks bookmarks={bookmarks} pinned={profile.pinned} />
    </div>
  );
}
