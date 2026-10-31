/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router";
import {
  isProfileMissing,
  publicProfileQueryOptions,
  usePublicProfileBookmarks,
} from "@/features/user/api/profile-api";
import { ProfileHeader } from "@/features/user/components/ProfileHeader";
import { ProfileView } from "@/features/user/components/ProfileView";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { cx } from "@/shared/ui/cx";
import { FORM_MAX_WIDTH } from "@/shared/ui/page-layout";

/**
 * A person's page, the same for anonymous visitors and members: it reads only the public API, and
 * the frame around it is chosen by the router.
 */
export function PublicProfilePage() {
  const { handle = "" } = useParams<{ handle: string }>();
  const query = useQuery(publicProfileQueryOptions(handle));
  const bookmarks = usePublicProfileBookmarks(handle);
  const profile = query.data;

  if (query.isPending) return <AppPageLoader label="Loading profile…" />;

  if (!profile) {
    const missing = isProfileMissing(query.error);
    return (
      <AppPage>
        <AppSurface className="flex flex-1 flex-col overflow-auto">
          <AppEmptyState
            className={cx(FORM_MAX_WIDTH, "my-auto")}
            title={missing ? "Profile not found" : "This profile could not be loaded"}
            description={
              missing
                ? "This address does not lead to a public profile."
                : "The request failed before the profile arrived. Check your connection and try again."
            }
            action={
              missing ? undefined : (
                <AppButton disabled={query.isFetching} onClick={() => void query.refetch()}>
                  Try again
                </AppButton>
              )
            }
          />
        </AppSurface>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <AppSurface
        className="app-scroll flex flex-1 flex-col gap-6 overflow-auto"
        data-scroll-memory="page"
      >
        <ProfileHeader
          avatarUrl={profile.avatarUrl}
          breadcrumbs={[{ label: "Explore", to: "/explore" }, { label: profile.fullName }]}
          handle={profile.handle}
          name={profile.fullName}
        />
        <ProfileView bookmarks={bookmarks} profile={profile} />
      </AppSurface>
    </AppPage>
  );
}
