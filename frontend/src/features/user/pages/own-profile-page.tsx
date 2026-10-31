/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, PencilLine, X } from "lucide-react";
import { Link } from "react-router";
import { useUser } from "@/capabilities/workspace-context/session";
import { ownProfileQueryOptions, useOwnProfileBookmarks } from "@/features/user/api/profile-api";
import { ProfileAvatarSettings } from "@/features/user/components/ProfileAvatarSettings";
import { ProfileDetailsForm } from "@/features/user/components/ProfileDetailsForm";
import { ProfileHeader } from "@/features/user/components/ProfileHeader";
import { ProfilePasswordForm } from "@/features/user/components/ProfilePasswordForm";
import { ProfilePinsEditor } from "@/features/user/components/ProfilePinsEditor";
import { ProfileSummary } from "@/features/user/components/ProfileSummary";
import { ProfileView } from "@/features/user/components/ProfileView";
import { profilePath } from "@/shared/lib/profile-path";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { appButtonClass } from "@/shared/ui/button-styles";
import { cx } from "@/shared/ui/cx";
import { FORM_MAX_WIDTH } from "@/shared/ui/page-layout";

const VIEWS = ["page", "edit"] as const;

/**
 * A person's own profile: their page as others read it, whether or not it is public, with counts
 * only they see, and the way into editing all of it.
 */
export function OwnProfilePage() {
  const { data: user } = useUser();
  const query = useQuery(ownProfileQueryOptions());
  const bookmarks = useOwnProfileBookmarks("");
  const [view, setView] = useSearchParamState("view", "page", VIEWS);

  if (query.isPending || !user) return <AppPageLoader label="Loading your profile…" />;

  if (!query.data) {
    return (
      <AppPage>
        <AppSurface className="flex flex-1 flex-col overflow-auto">
          <AppEmptyState
            className={cx(FORM_MAX_WIDTH, "my-auto")}
            title="Your profile could not be loaded"
            description="The request failed before your profile arrived. Check your connection and try again."
            action={
              <AppButton disabled={query.isFetching} onClick={() => void query.refetch()}>
                Try again
              </AppButton>
            }
          />
        </AppSurface>
      </AppPage>
    );
  }

  const { profile } = query.data;
  const editing = view === "edit";

  return (
    <AppPage>
      <AppSurface
        className="app-scroll flex flex-1 flex-col gap-6 overflow-auto"
        data-scroll-memory="page"
      >
        <ProfileHeader
          avatarUrl={profile.avatarUrl}
          className={editing ? FORM_MAX_WIDTH : undefined}
          handle={profile.handle}
          name={profile.fullName}
          actions={
            <>
              {user.profilePublic ? null : <AppBadge>Private</AppBadge>}
              {user.profilePublic && !editing ? (
                <Link
                  to={profilePath(profile.handle)}
                  className={appButtonClass({ variant: "secondary", size: "sm" })}
                >
                  <ArrowUpRight size={14} aria-hidden="true" />
                  Public page
                </Link>
              ) : null}
              <AppButton
                size="sm"
                variant="secondary"
                onClick={() => setView(editing ? "page" : "edit")}
              >
                {editing ? <X size={14} /> : <PencilLine size={14} />}
                {editing ? "Done" : "Edit profile"}
              </AppButton>
            </>
          }
        />
        {editing ? (
          <div
            className={cx(
              FORM_MAX_WIDTH,
              "grid gap-6 [&>*+*]:border-t [&>*+*]:border-line [&>*+*]:pt-6",
            )}
          >
            <ProfileAvatarSettings user={user} />
            <ProfileDetailsForm user={user} />
            <ProfilePinsEditor
              key={profile.pinned.map((bookmark) => bookmark.publicId).join()}
              pinned={profile.pinned}
            />
            <ProfilePasswordForm />
          </div>
        ) : (
          <>
            <ProfileSummary profile={query.data} />
            <ProfileView bookmarks={bookmarks} profile={profile} />
          </>
        )}
      </AppSurface>
    </AppPage>
  );
}
