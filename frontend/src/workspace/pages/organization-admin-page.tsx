import { useQuery } from "@tanstack/react-query";
import { ClipboardList, Mail, Plus, Settings, Shield, Users } from "lucide-react";
import { motion } from "motion/react";
import { Link, useNavigate, useParams } from "react-router";
import { AppButton, AppPage, AppPageHeader, AppSurface, AppTabs } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { getOrganizationAdminDashboard } from "../api/workspaceService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminStatCard } from "../components/admin/AdminStatCard";
import { StatusBadge } from "../components/admin/StatusBadge";
import { useWorkspaceContext } from "../hooks";

const tabs = [
	{ label: "Teams", value: "teams" },
	{ label: "Members", value: "members" },
	{ label: "Roles & Templates", value: "roles" },
	{ label: "Invitations", value: "invitations" },
	{ label: "Settings", value: "settings" },
] as const;

export function OrganizationAdminPage() {
	const { organizationId = "" } = useParams();
	const id = Number(organizationId);
	const navigate = useNavigate();
	const { data: workspace } = useWorkspaceContext();
	const { data } = useQuery({
		queryKey: ["orgAdminDashboard", id],
		queryFn: () => getOrganizationAdminDashboard(id),
		enabled: Boolean(id),
	});

	if (workspace && !workspace.permissions.canViewOrganization) return <NotFoundError />;

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1">
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppPageHeader
						title={data?.organization.name ?? "Organization Admin"}
						description="Manage teams, roles, invitations, and access control."
						aside={<HeaderActions id={id} canCreate={Boolean(data?.permissions.canCreateTeams)} />}
					/>
					<AppTabs
						items={tabs as unknown as Array<{ label: string; value: string }>}
						value="teams"
						onChange={(value) => void navigate(`/workspace/organizations/${id}/${value}`)}
					/>
					<div className="grid gap-4 md:grid-cols-5">
						<AdminStatCard label="Total Teams" value={data?.stats.totalTeams ?? 0} detail={`${data?.stats.activeTeams ?? 0} active`} icon={<Users size={18} />} />
						<AdminStatCard label="Members" value={data?.stats.totalMembers ?? 0} detail="Active users" icon={<Users size={18} />} />
						<AdminStatCard label="Models" value={data?.stats.totalModels ?? 0} detail="Organization total" icon={<Shield size={18} />} />
						<AdminStatCard label="Invitations" value={data?.stats.pendingInvitations ?? 0} detail="Pending" icon={<Mail size={18} />} />
						<AdminStatCard label="Quota" value={data?.stats.quotaLimit ? `${data.stats.quotaUsed}/${data.stats.quotaLimit}` : "No quota"} icon={<ClipboardList size={18} />} />
					</div>
					<div className="grid gap-4 xl:grid-cols-2">
						<AdminDataPanel title="Recent Teams" description="Latest team overview">
							<div className="divide-y divide-[var(--border-soft)]">
								{data?.recentTeams.map((team) => (
									<Link key={team.id} to={`/workspace/organizations/${id}/teams/${team.id}`} className="flex items-center justify-between p-4 hover:bg-[var(--surface-tertiary)]">
										<div><p className="font-semibold">{team.name}</p><p className="text-xs text-[var(--text-secondary)]">{team.memberCount ?? 0} members · {team.modelCount ?? 0} models</p></div>
										<StatusBadge value={team.status ?? "ACTIVE"} />
									</Link>
								))}
							</div>
						</AdminDataPanel>
						<AdminDataPanel title="Recent Invitations" description="Pending and latest invites">
							<div className="divide-y divide-[var(--border-soft)]">
								{data?.recentInvitations.map((invite) => (
									<div key={invite.id} className="flex items-center justify-between p-4">
										<div><p className="font-semibold">{invite.email}</p><p className="text-xs text-[var(--text-secondary)]">{invite.role}</p></div>
										<StatusBadge value={invite.status} />
									</div>
								))}
							</div>
						</AdminDataPanel>
					</div>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}

function HeaderActions({ id, canCreate }: { id: number; canCreate: boolean }) {
	return (
		<>
			<Link to={`/workspace/organizations/${id}/settings`}><AppButton variant="secondary"><Settings size={16} />Settings</AppButton></Link>
			{canCreate ? <Link to={`/workspace/organizations/${id}/teams`}><AppButton><Plus size={16} />Create Team</AppButton></Link> : null}
		</>
	);
}
