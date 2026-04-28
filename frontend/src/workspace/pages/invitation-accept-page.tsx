import { motion } from "motion/react";
import { useNavigate, useParams } from "react-router";
import { AppButton, AppPage, AppPageHeader, AppPanel, AppSurface } from "../../app/components";
import { acceptInvitation, declineInvitation } from "../api/workspaceService";

export function InvitationAcceptPage() {
	const navigate = useNavigate();
	const { token = "" } = useParams();

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1">
				<AppSurface className="flex flex-1 items-center justify-center overflow-auto">
					<AppPanel className="w-full max-w-2xl">
						<AppPageHeader
							eyebrow="Invitation"
							title="Join Workspace"
							description="Accept this invitation to enter the shared MLSuite workspace, or decline it and keep your current setup untouched."
						/>
						<div className="mt-6 flex flex-wrap gap-3">
							<AppButton
								type="button"
								onClick={() => {
									void acceptInvitation(token).then(() => navigate("/workspace"));
								}}
							>
								Accept Invite
							</AppButton>
							<AppButton
								type="button"
								variant="secondary"
								onClick={() => {
									void declineInvitation(token).then(() => navigate("/workspace"));
								}}
							>
								Decline
							</AppButton>
						</div>
					</AppPanel>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
