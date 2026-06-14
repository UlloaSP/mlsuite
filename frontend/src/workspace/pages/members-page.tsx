import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Shield, UserCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AppPage, AppPageHeader, AppSelect, AppSurface } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import {
  getOrganizationMembers,
  getTeams,
  removeOrganizationMember,
  updateOrganizationMemberRole,
} from "../api/workspaceService";
import { AdminDataPanel } from "../components/admin/AdminDataPanel";
import { AdminStatCard } from "../components/admin/AdminStatCard";
import { MemberTable } from "../components/MemberTable";
import { useWorkspaceContext } from "../hooks";

export function MembersPage() {
  const { organizationId = "" } = useParams();
  const qc = useQueryClient();
  const id = Number(organizationId);
  const { data: workspace } = useWorkspaceContext();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const { data: members = [] } = useQuery({
    queryKey: ["organizationMembers", id],
    queryFn: () => getOrganizationMembers(id),
    enabled: Boolean(id),
  });
  useQuery({ queryKey: ["teams", id], queryFn: () => getTeams(id), enabled: Boolean(id) });
  const filtered = useMemo(
    () =>
      members.filter((member) => {
        const text = `${member.fullName} ${member.email}`.toLowerCase();
        return (
          text.includes(query.toLowerCase()) && (role === "ALL" || member.role.systemKey === role)
        );
      }),
    [members, query, role],
  );

  if (workspace && !workspace.permissions.canViewMembers) return <NotFoundError />;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title="Members"
          description="Organization users, roles, and row-level permissions."
          breadcrumbs={[
            { label: "Workspace", to: "/workspace" },
            {
              label: workspace?.currentOrganization.name ?? "Organization",
              to: `/workspace/organizations/${id}`,
            },
            { label: "Members" },
          ]}
        />
        <div className="grid gap-4 md:grid-cols-4">
          <AdminStatCard
            label="Active Members"
            value={members.length}
            detail="Can access workspace"
            icon={<Users size={18} />}
          />
          <AdminStatCard
            label="Admins"
            value={
              members.filter((m) => m.role.systemKey === "ADMIN" || m.role.systemKey === "OWNER")
                .length
            }
            detail="Org management roles"
            icon={<Shield size={18} />}
          />
          <AdminStatCard
            label="Members"
            value={members.filter((m) => m.role.systemKey === "MEMBER").length}
            detail="Operational users"
            icon={<UserCheck size={18} />}
          />
          <AdminStatCard
            label="Read-only"
            value={members.filter((m) => m.role.systemKey === "VIEWER").length}
            detail="Viewer access"
            icon={<Search size={18} />}
          />
        </div>
        <AdminDataPanel
          title="All Members"
          description={`${filtered.length} members in this view`}
          search={query}
          onSearch={setQuery}
          actions={
            <AppSelect value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="ALL">All roles</option>
              <option value="OWNER">Owner</option>
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </AppSelect>
          }
        >
          <div className="p-6 pt-2">
            <MemberTable
              rows={filtered}
              onRoleChange={(membershipId, roleDefinitionId) => {
                void updateOrganizationMemberRole(id, membershipId, roleDefinitionId).then(() =>
                  Promise.all([
                    qc.invalidateQueries({ queryKey: ["organizationMembers", id] }),
                    qc.invalidateQueries({ queryKey: ["workspaceContext"] }),
                  ]),
                );
              }}
              onRemove={(membershipId) => {
                void removeOrganizationMember(id, membershipId).then(() =>
                  qc.invalidateQueries({ queryKey: ["organizationMembers", id] }),
                );
              }}
            />
          </div>
        </AdminDataPanel>
      </AppSurface>
    </AppPage>
  );
}
