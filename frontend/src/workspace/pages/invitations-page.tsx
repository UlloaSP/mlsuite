import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { AppButton, AppPage, AppPageHeader, AppPanel, AppSurface } from "../../app/components";
import { createInvitation, getInvitations, getTeams, revokeInvitation } from "../api/workspaceService";
import { InviteForm } from "../components/InviteForm";
import { RoleBadge } from "../components/RoleBadge";

export function InvitationsPage() {
	const { organizationId = "" } = useParams();
	const qc = useQueryClient();
	const id = Number(organizationId);
	const { data: invitations = [] } = useQuery({
		queryKey: ["invitations", id],
		queryFn: () => getInvitations(id),
		enabled: Boolean(id),
	});
	const { data: teams = [] } = useQuery({
		queryKey: ["teams", id],
		queryFn: () => getTeams(id),
		enabled: Boolean(id),
	});

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1">
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppPageHeader
						eyebrow="Workspace"
						title="Invitations"
						description="Issue and revoke invites. Team assignment stays optional in phase one."
						backHref={`/workspace/organizations/${id}`}
					/>
					<InviteForm
						teams={teams}
						onSubmit={async (payload) => {
							await createInvitation(id, payload);
							await qc.invalidateQueries({ queryKey: ["invitations", id] });
						}}
					/>
					<div className="space-y-3">
						{invitations.map((invitation) => (
							<AppPanel key={invitation.id}>
								<div className="flex flex-wrap items-center justify-between gap-4">
									<div className="space-y-2">
										<p className="text-base font-semibold text-[var(--text-primary)]">{invitation.email}</p>
										<div className="flex flex-wrap gap-2">
											<RoleBadge value={invitation.role} />
											<RoleBadge value={invitation.status} />
										</div>
									</div>
									<AppButton
										type="button"
										variant="danger"
										onClick={() => {
											void revokeInvitation(id, invitation.id).then(() =>
												qc.invalidateQueries({ queryKey: ["invitations", id] }),
											);
										}}
									>
										Revoke
									</AppButton>
								</div>
							</AppPanel>
						))}
					</div>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
