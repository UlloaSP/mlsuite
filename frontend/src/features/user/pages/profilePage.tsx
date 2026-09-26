/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { m as motion } from "motion/react";
import { AppBadge } from "@/shared/ui/AppBadge";
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-1"
      >
        <AppSurface className="flex flex-1 flex-col overflow-auto app-scroll">
          <ProfileHeader
            imageUrl={user?.avatarUrl}
            name={user?.userName || user?.fullName || "Guest"}
            provider={user.systemRole}
          />
          {workspace ? (
            <AppPanel className="mb-6 mt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-secondary">
                    Current Workspace
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-fg">
                    {workspace.currentOrganization.name}
                  </p>
                  <p className="mt-1 text-sm text-fg-secondary">
                    {workspace.memberships.length} organization memberships
                  </p>
                </div>
                <AppBadge tone="accent">{workspace.currentMembership.role}</AppBadge>
              </div>
            </AppPanel>
          ) : null}
          <ProfileBody user={user} />
        </AppSurface>
      </motion.div>
    </AppPage>
  );
}
