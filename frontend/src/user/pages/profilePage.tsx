/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { m as motion } from "motion/react";
import { AppBadge, AppPage, AppPanel, AppSurface } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { useWorkspaceContext } from "../../workspace/hooks";
import { ProfileBody } from "../components/ProfileBody";
import { ProfileHeader } from "../components/ProfileHeader";
import { useUser } from "../hooks"; // Adjust the import path as necessary

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
									<p className="text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)]">
										Current Workspace
									</p>
									<p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
										{workspace.currentOrganization.name}
									</p>
									<p className="mt-1 text-sm text-[var(--text-secondary)]">
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
