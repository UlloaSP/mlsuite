import { Mail, Shield, Users } from "lucide-react";
import { useParams } from "react-router";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { AdminDataPanel } from "@/features/workspace/components/admin/AdminDataPanel";
import { AdminStatCard } from "@/features/workspace/components/admin/AdminStatCard";
import { StatusBadge } from "@/features/workspace/components/admin/StatusBadge";
import { useOrganizationAdminDashboardQuery } from "@/features/workspace/api/workspace.queries";
import { organizationRouteErrorStatus } from "@/features/workspace/lib/organization-route-error";

export function OrganizationAdminPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const { data, error, isError } = useOrganizationAdminDashboardQuery(id);

  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (isError) return <RouteStatusPage status={organizationRouteErrorStatus(error)} />;
  if (data && !data.permissions.canViewOrganization) return <RouteStatusPage status={403} />;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title={data?.organization.name ?? "Organization Admin"}
          description="Manage members, roles, invitations, and access control."
          breadcrumbs={[
            { label: "Workspace", to: "/workspace" },
            { label: data?.organization.name ?? "Organization" },
          ]}
        />
        <div className="grid gap-4 md:grid-cols-3">
          <AdminStatCard
            label="Members"
            value={data?.stats.totalMembers ?? 0}
            detail="Active users"
            icon={<Users size={18} />}
          />
          <AdminStatCard
            label="Models"
            value={data?.stats.totalModels ?? 0}
            detail="Organization total"
            icon={<Shield size={18} />}
          />
          <AdminStatCard
            label="Invitations"
            value={data?.stats.pendingInvitations ?? 0}
            detail="Pending"
            icon={<Mail size={18} />}
          />
        </div>
        <div>
          <AdminDataPanel title="Recent Invitations" description="Pending and latest invites">
            <div className="divide-y divide-[var(--border-soft)]">
              {data?.recentInvitations.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-semibold">{invite.email}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{invite.role}</p>
                  </div>
                  <StatusBadge value={invite.status} />
                </div>
              ))}
            </div>
          </AdminDataPanel>
        </div>
      </AppSurface>
    </AppPage>
  );
}
