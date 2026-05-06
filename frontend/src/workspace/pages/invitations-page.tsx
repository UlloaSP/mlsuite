import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, RotateCcw, X } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AppButton, AppPage, AppPageHeader, AppSelect, AppSurface } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { bulkRevokeInvitations, createInvitation, getInvitations, getTeams, resendInvitation, revokeInvitation } from "../api/workspaceService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminStatCard } from "../components/admin/AdminStatCard";
import { StatusBadge } from "../components/admin/StatusBadge";
import { InviteForm } from "../components/InviteForm";
import { RoleBadge } from "../components/RoleBadge";
import { useWorkspaceContext } from "../hooks";
import { invitationRoleOptions } from "../permissions/invitationRoleOptions";
import type { InvitationStatus, OrganizationRole } from "../types";

const statuses: Array<InvitationStatus | "ALL"> = ["ALL", "PENDING", "ACCEPTED", "EXPIRED", "REVOKED"];

export function InvitationsPage() {
	const { organizationId = "" } = useParams();
	const qc = useQueryClient();
	const id = Number(organizationId);
	const { data: workspace } = useWorkspaceContext();
	const [query, setQuery] = useState("");
	const [status, setStatus] = useState<InvitationStatus | "ALL">("PENDING");
	const [open, setOpen] = useState(false);
	const [selected, setSelected] = useState<number[]>([]);
	const { data: invitations = [] } = useQuery({ queryKey: ["invitations", id], queryFn: () => getInvitations(id), enabled: Boolean(id) });
	const { data: teams = [] } = useQuery({ queryKey: ["teams", id], queryFn: () => getTeams(id), enabled: Boolean(id) });
	const filtered = useMemo(
		() =>
			invitations.filter((invite) =>
				invite.email.toLowerCase().includes(query.toLowerCase()) && (status === "ALL" || invite.status === status),
			),
		[invitations, query, status],
	);
	if (workspace && !workspace.permissions.canViewInvitations) return <NotFoundError />;
	const roleOptions: OrganizationRole[] = invitationRoleOptions(workspace?.permissions.canTransferOwnership ?? false);

	return (
		<AppPage>
			<motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="flex flex-1">
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppPageHeader title="Invitations" description="Invite users, assign starting role, and revoke pending access." backHref={`/workspace/organizations/${id}`} aside={workspace?.permissions.canManageInvitations ? <AppButton onClick={() => setOpen(true)}><Plus size={16} />Invite Member</AppButton> : null} />
					<div className="grid gap-4 md:grid-cols-4">
						{statuses.slice(1).map((item) => <AdminStatCard key={item} label={item} value={invitations.filter((i) => i.status === item).length} icon={<Mail size={18} />} />)}
					</div>
					<AdminDataPanel
						title="All Invitations"
						description={`${filtered.length} invitations in this view`}
						search={query}
						onSearch={setQuery}
						actions={<><AppSelect value={status} onChange={(event) => setStatus(event.target.value as InvitationStatus | "ALL")}>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</AppSelect>{selected.length ? <AppButton variant="danger" onClick={() => void bulkRevokeInvitations(id, selected).then(() => { setSelected([]); return qc.invalidateQueries({ queryKey: ["invitations", id] }); })}>Bulk revoke</AppButton> : null}</>}
					>
						<table className="w-full min-w-[820px] text-sm">
							<thead className="border-b border-[var(--border-soft)] text-left"><tr><th className="p-4">Email</th><th>Role</th><th>Team</th><th>Status</th><th>Expires</th><th>Actions</th></tr></thead>
							<tbody>
								{filtered.map((invite) => (
									<tr key={invite.id} className="border-b border-[var(--border-soft)] last:border-0">
										<td className="p-4 font-semibold"><input className="mr-3" type="checkbox" checked={selected.includes(invite.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, invite.id] : current.filter((id) => id !== invite.id))} />{invite.email}</td>
										<td><RoleBadge value={invite.role} /></td>
										<td>{teams.find((team) => team.id === invite.teamId)?.name ?? "No team"}</td>
										<td><StatusBadge value={invite.status} /></td>
										<td>{new Date(invite.expiresAt).toLocaleDateString()}</td>
										<td className="flex gap-2 py-3">
											<AppButton variant="secondary" onClick={() => void resendInvitation(id, invite.id).then(() => qc.invalidateQueries({ queryKey: ["invitations", id] }))}><RotateCcw size={14} />Resend</AppButton>
											<AppButton variant="secondary" onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/invite/${invite.token}`)}>Copy</AppButton>
											{workspace?.permissions.canManageInvitations ? <AppButton variant="danger" onClick={() => void revokeInvitation(id, invite.id).then(() => qc.invalidateQueries({ queryKey: ["invitations", id] }))}><X size={14} />Revoke</AppButton> : null}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</AdminDataPanel>
					{open ? <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4"><div className="w-full max-w-[620px] rounded-[20px] bg-white p-6 shadow-[var(--shadow-card)]"><div className="mb-4 flex justify-between"><div><h2 className="text-xl font-semibold">Create Invitation</h2><p className="text-sm text-[var(--text-secondary)]">Send access to organization workspace.</p></div><button onClick={() => setOpen(false)}>x</button></div><InviteForm teams={teams} roleOptions={roleOptions} onSubmit={async (payload) => { await createInvitation(id, payload); setOpen(false); await qc.invalidateQueries({ queryKey: ["invitations", id] }); }} /></div></div> : null}
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
