import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { Box, MoreHorizontal, Plus, Users, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { useCreateTeamMutation } from "@/features/workspace/api/team.mutations";
import { AdminDataPanel } from "@/features/workspace/components/admin/AdminDataPanel";
import { AdminStatCard } from "@/features/workspace/components/admin/AdminStatCard";
import { QuotaBar } from "@/features/workspace/components/admin/QuotaBar";
import { StatusBadge } from "@/features/workspace/components/admin/StatusBadge";
import { CreateTeamModal } from "@/features/workspace/components/CreateTeamModal";
import {
  useOrganizationMembersQuery,
  useOrganizationTeamsQuery,
} from "@/features/workspace/api/workspace.queries";

export function TeamsPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const { data: workspace } = useWorkspaceContext();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [open, setOpen] = useState(false);
  const { data: teams = [] } = useOrganizationTeamsQuery(id);
  const { data: members = [] } = useOrganizationMembersQuery(
    id,
    Boolean(workspace?.permissions.canCreateTeams),
  );
  const mutation = useCreateTeamMutation(id);
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
          breadcrumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Teams" }]}
          actions={
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
            <AppSelect
              value={status}
              onValueChange={setStatus}
              options={[
                { value: "ALL", label: "All status" },
                { value: "ACTIVE", label: "Active" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "ARCHIVED", label: "Archived" },
              ]}
            />
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
            onCreate={(payload) => mutation.mutate(payload, { onSuccess: () => setOpen(false) })}
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
