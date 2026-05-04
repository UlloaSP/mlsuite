import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { AppPage, AppPageHeader, AppSurface } from "../../app/components";
import {
	getOrganizationMembers,
	removeOrganizationMember,
	updateOrganizationMemberRole,
} from "../api/workspaceService";
import { MemberTable } from "../components/MemberTable";

const organizationRoles = ["OWNER", "ADMIN", "MEMBER", "VIEWER"] as const;

export function MembersPage() {
	const { organizationId = "" } = useParams();
	const qc = useQueryClient();
	const id = Number(organizationId);
	const { data: members = [] } = useQuery({
		queryKey: ["organizationMembers", id],
		queryFn: () => getOrganizationMembers(id),
		enabled: Boolean(id),
	});

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1">
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppPageHeader
						eyebrow="Workspace"
						title="Members"
						description="Organization-level RBAC lives here. Change roles carefully because backend authorization follows these states."
						backHref={`/workspace/organizations/${id}`}
					/>
					<MemberTable
						rows={members}
						roles={[...organizationRoles]}
						onRoleChange={(membershipId, role) => {
							void updateOrganizationMemberRole(id, membershipId, role).then(() =>
								qc.invalidateQueries({ queryKey: ["organizationMembers", id] }),
							);
						}}
						onRemove={(membershipId) => {
							void removeOrganizationMember(id, membershipId).then(() =>
								qc.invalidateQueries({ queryKey: ["organizationMembers", id] }),
							);
						}}
					/>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
