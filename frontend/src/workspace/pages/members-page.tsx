import {
  WORKSPACE_CONTEXT_QUERY_KEY,
  organizationMembersQueryKey,
} from "@/api/workspace/hooks/query-keys";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Shield, UserCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AppPage, AppPageHeader, AppSelect, AppSurface } from "@/app/components";
import { NotFoundError } from "@/app/pages/error-page";
import { removeOrganizationMember, updateOrganizationMemberRole } from "@/api/workspace/services";
import { AdminDataPanel } from "@/workspace/components/admin/AdminDataPanel";
import { AdminStatCard } from "@/workspace/components/admin/AdminStatCard";
import { MemberTable } from "@/workspace/components/MemberTable";
import {
  useOrganizationMembersQuery,
  useOrganizationTeamsQuery,
  useWorkspaceContext,
} from "@/api/workspace/hooks";

export function MembersPage() {
  const { organizationId = "" } = useParams();
  const qc = useQueryClient();
  const id = Number(organizationId);
  const { data: workspace } = useWorkspaceContext();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const { data: members = [] } = useOrganizationMembersQuery(id);
  useOrganizationTeamsQuery(id);
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
          breadcrumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Members" }]}
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
            <AppSelect
              value={role}
              onValueChange={setRole}
              options={[
                { value: "ALL", label: "All roles" },
                { value: "OWNER", label: "Owner" },
                { value: "ADMIN", label: "Admin" },
                { value: "MEMBER", label: "Member" },
                { value: "VIEWER", label: "Viewer" },
              ]}
            />
          }
        >
          <div className="p-6 pt-2">
            <MemberTable
              rows={filtered}
              onRoleChange={(membershipId, roleDefinitionId) => {
                void updateOrganizationMemberRole(id, membershipId, roleDefinitionId).then(() =>
                  Promise.all([
                    qc.invalidateQueries({ queryKey: organizationMembersQueryKey(id) }),
                    qc.invalidateQueries({ queryKey: WORKSPACE_CONTEXT_QUERY_KEY }),
                  ]),
                );
              }}
              onRemove={(membershipId) => {
                void removeOrganizationMember(id, membershipId).then(() =>
                  qc.invalidateQueries({ queryKey: organizationMembersQueryKey(id) }),
                );
              }}
            />
          </div>
        </AdminDataPanel>
      </AppSurface>
    </AppPage>
  );
}
