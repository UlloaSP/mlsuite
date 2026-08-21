import { useParams } from "react-router";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { useOrganizationAdminDashboardQuery } from "@/features/workspace/api/workspace.queries";
import { OrganizationSettingsContent } from "@/features/workspace/components/OrganizationSettingsContent";
import { organizationRouteErrorStatus } from "@/features/workspace/lib/organization-route-error";

export function OrganizationSettingsPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const dashboard = useOrganizationAdminDashboardQuery(id);
  const permissions = dashboard.data?.permissions;
  const organization = dashboard.data?.organization;

  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (dashboard.isError) {
    return <RouteStatusPage status={organizationRouteErrorStatus(dashboard.error)} />;
  }
  if (dashboard.isLoading || !organization || !permissions) {
    return (
      <AppPage>
        <AppSurface className="flex flex-1 items-center justify-center overflow-auto">
          <AppCopy>Loading organization settings...</AppCopy>
        </AppSurface>
      </AppPage>
    );
  }
  if (!permissions.canViewOrganization) return <RouteStatusPage status={403} />;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          eyebrow="Organization settings"
          title={organization.name}
          description="Manage this organization's identity, ownership, and lifecycle."
          breadcrumbs={[
            { label: "Workspace", to: "/workspace" },
            { label: organization.name, to: `/workspace/organizations/${id}` },
            { label: "Settings" },
          ]}
        />
        <OrganizationSettingsContent
          key={id}
          organization={organization}
          permissions={permissions}
        />
      </AppSurface>
    </AppPage>
  );
}
