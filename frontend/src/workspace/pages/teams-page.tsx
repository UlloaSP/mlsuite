import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Box, MoreHorizontal, Plus, Users, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { AppButton, AppSelect, AppTextArea, AppTextField } from "../../app/components/ui-controls";
import { AppPage, AppPageHeader, AppSurface } from "../../app/components/ui";
import { NotFoundError } from "../../app/pages/error-page";
import { createTeam, getOrganizationMembers, getTeams } from "../api/workspaceService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminStatCard } from "../components/admin/AdminStatCard";
import { QuotaBar } from "../components/admin/QuotaBar";
import { StatusBadge } from "../components/admin/StatusBadge";
import { useWorkspaceContext } from "../hooks";

export function TeamsPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const qc = useQueryClient();
  const { data: workspace } = useWorkspaceContext();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [open, setOpen] = useState(false);
  const { data: teams = [] } = useQuery({
    queryKey: ["teams", id],
    queryFn: () => getTeams(id),
    enabled: Boolean(id),
  });
  const { data: members = [] } = useQuery({
    queryKey: ["organizationMembers", id],
    queryFn: () => getOrganizationMembers(id),
    enabled: Boolean(id) && Boolean(workspace?.permissions.canCreateTeams),
  });
  const mutation = useMutation({
    mutationFn: (payload: Parameters<typeof createTeam>[1]) => createTeam(id, payload),
    onSuccess: async () => {
      setOpen(false);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["teams", id] }),
        qc.invalidateQueries({ queryKey: ["orgAdminDashboard", id] }),
        qc.invalidateQueries({ queryKey: ["workspaceContext"] }),
      ]);
    },
  });
  const filtered = useMemo(
    () =>
      teams.filter((team) => {
        const text = `${team.name} ${team.description ?? ""} ${team.leadName ?? ""}`.toLowerCase();
        return text.includes(query.toLowerCase()) && (status === "ALL" || team.status === status);
      }),
    [query, status, teams],
  );

  if (workspace && !workspace.permissions.canViewTeams) return <NotFoundError />;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title="Team Management"
          description="Create, manage, and organize model teams."
          backHref={`/workspace/organizations/${id}`}
          aside={
            workspace?.permissions.canCreateTeams ? (
              <AppButton onClick={() => setOpen(true)}>
                <Plus size={16} />
                Create Team
              </AppButton>
            ) : null
          }
        />
        <div className="grid gap-4 md:grid-cols-4">
          <AdminStatCard
            label="Total Teams"
            value={teams.length}
            detail={`${teams.filter((t) => t.status === "ACTIVE").length} active`}
            icon={<Users size={18} />}
          />
          <AdminStatCard
            label="Total Members"
            value={teams.reduce((sum, team) => sum + (team.memberCount ?? 0), 0)}
            detail="Across all teams"
            icon={<Users size={18} />}
          />
          <AdminStatCard
            label="Total Models"
            value={teams.reduce((sum, team) => sum + (team.modelCount ?? 0), 0)}
            detail="Team-scoped models"
            icon={<Box size={18} />}
          />
          <AdminStatCard
            label="Quota Usage"
            value="0%"
            detail="Average across teams"
            icon={<Zap size={18} />}
          />
        </div>
        <AdminDataPanel
          title="All Teams"
          description={`${filtered.length} teams in this view`}
          search={query}
          onSearch={setQuery}
          actions={
            <AppSelect value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="ALL">All status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </AppSelect>
          }
        >
          <table className="w-full min-w-[920px] text-sm">
            <thead className="border-b border-[var(--border-soft)] text-left">
              <tr>
                <th className="p-4">Team</th>
                <th>Lead</th>
                <th>Members</th>
                <th>Models</th>
                <th>Quota</th>
                <th>Status</th>
                <th aria-label="Team actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((team) => (
                <tr key={team.id} className="border-b border-[var(--border-soft)] last:border-0">
                  <td className="p-4">
                    <Link
                      to={`/workspace/organizations/${id}/teams/${team.id}`}
                      className="font-semibold text-[var(--text-primary)] hover:underline"
                    >
                      {team.name}
                    </Link>
                    <p className="max-w-[300px] truncate text-xs text-[var(--text-secondary)]">
                      {team.description || "No description"}
                    </p>
                  </td>
                  <td>{team.leadName || "Unassigned"}</td>
                  <td>{team.memberCount ?? 0}</td>
                  <td>{team.modelCount ?? 0}</td>
                  <td>
                    <QuotaBar used={team.quotaUsed} limit={team.quotaLimit} />
                  </td>
                  <td>
                    <StatusBadge value={team.status ?? "ACTIVE"} />
                  </td>
                  <td>
                    <MoreHorizontal size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </AdminDataPanel>
        {open ? (
          <CreateTeamModal
            members={members}
            onClose={() => setOpen(false)}
            onCreate={(payload) => mutation.mutate(payload)}
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}

function CreateTeamModal({
  members,
  onClose,
  onCreate,
}: {
  members: Array<{ id: number; fullName: string; email: string }>;
  onClose: () => void;
  onCreate: (payload: Parameters<typeof createTeam>[1]) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [lead, setLead] = useState("");
  const [quota, setQuota] = useState("");
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 p-4">
      <div className="w-full max-w-[560px] rounded-[20px] bg-white p-6 shadow-[var(--shadow-card)]">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Create New Team</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Create a team and optional lead/quota.
            </p>
          </div>
          <button type="button" onClick={onClose}>
            x
          </button>
        </div>
        <div className="grid gap-4">
          <AppTextField
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., NLP Research Team"
          />
          <AppTextArea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does this team work on?"
          />
          <AppSelect value={lead} onChange={(e) => setLead(e.target.value)}>
            <option value="">No lead</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} - {m.email}
              </option>
            ))}
          </AppSelect>
          <AppTextField
            value={quota}
            onChange={(e) => setQuota(e.target.value)}
            placeholder="Monthly inference quota"
            type="number"
          />
          <div className="flex justify-end gap-3">
            <AppButton variant="secondary" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton
              disabled={!name.trim()}
              onClick={() =>
                onCreate({
                  name,
                  description,
                  leadMembershipId: lead ? Number(lead) : undefined,
                  monthlyInferenceQuota: quota ? Number(quota) : undefined,
                })
              }
            >
              Create Team
            </AppButton>
          </div>
        </div>
      </div>
    </div>
  );
}
