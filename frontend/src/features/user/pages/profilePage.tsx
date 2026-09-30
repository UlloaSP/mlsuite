/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge, enumLabel } from "@/shared/ui/AppBadge";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { ProfileBody } from "@/features/user/components/ProfileBody";
import { ProfileHeader } from "@/features/user/components/ProfileHeader";
import { useUser } from "@/capabilities/workspace-context/session";

export function ProfilePage() {
  const { data: user, isError } = useUser();
  const { data: workspace } = useWorkspaceContext();

  if (!user || isError) return <NotFoundError />;

  return (
    <AppPage>
      <AppSurface className="app-scroll flex flex-1 flex-col gap-6 overflow-auto">
        <ProfileHeader
          imageUrl={user?.avatarUrl}
          name={user?.fullName || user?.userName || "Guest"}
          provider={enumLabel(user.systemRole)}
        />
        {workspace ? (
          <AppPanel>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-secondary">
                  Current workspace
                </p>
                <p className="mt-2 text-2xl font-semibold text-fg">
                  {workspace.currentOrganization.name}
                </p>
                <p className="mt-1 text-sm text-fg-secondary">
                  {workspace.memberships.length} organization{" "}
                  {workspace.memberships.length === 1 ? "membership" : "memberships"}
                </p>
              </div>
              <AppBadge tone="accent">{workspace.currentMembership.roleDefinition.name}</AppBadge>
            </div>
          </AppPanel>
        ) : null}
        <ProfileBody user={user} />
      </AppSurface>
    </AppPage>
  );
}
