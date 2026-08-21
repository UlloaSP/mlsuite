import { Search, Shield, UserCheck, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppSurface } from "@/shared/ui/AppSurface";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import {
  useRemoveOrganizationMemberMutation,
  useUpdateOrganizationMemberRoleMutation,
} from "@/features/workspace/api/member.mutations";
import { AdminDataPanel } from "@/features/workspace/components/admin/AdminDataPanel";
import { AdminStatCard } from "@/features/workspace/components/admin/AdminStatCard";
import { MemberTable } from "@/features/workspace/components/MemberTable";
import {
  useOrganizationAdminDashboardQuery,
  useOrganizationMembersQuery,
} from "@/features/workspace/api/workspace.queries";
import { organizationRouteErrorStatus } from "@/features/workspace/lib/organization-route-error";

export function MembersPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const dashboard = useOrganizationAdminDashboardQuery(id);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const { data: members = [] } = useOrganizationMembersQuery(
    id,
    Boolean(dashboard.data?.permissions.canViewMembers),
  );
  const removeMember = useRemoveOrganizationMemberMutation(id);
  const updateMemberRole = useUpdateOrganizationMemberRoleMutation(id);
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

  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (dashboard.isError)
    return <RouteStatusPage status={organizationRouteErrorStatus(dashboard.error)} />;
  if (dashboard.data && !dashboard.data.permissions.canViewMembers)
    return <RouteStatusPage status={403} />;

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
                updateMemberRole.mutate({ membershipId, roleDefinitionId });
              }}
              onRemove={(membershipId) => {
                removeMember.mutate(membershipId);
              }}
            />
          </div>
        </AdminDataPanel>
      </AppSurface>
    </AppPage>
  );
}
