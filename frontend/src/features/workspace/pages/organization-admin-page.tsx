import { useParams } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { useOrganizationAdminDashboardQuery } from "@/features/workspace/api/workspace.queries";
import { OrganizationOverview } from "@/features/workspace/components/overview/OrganizationOverview";
import { organizationRouteErrorStatus } from "@/features/workspace/lib/organization-route-error";

/** Any organization's overview by id; the same dashboard as /workspace for the active one. */
export function OrganizationAdminPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const dashboard = useOrganizationAdminDashboardQuery(id);
  const { data: context } = useWorkspaceContext();

  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (dashboard.isError) {
    return <RouteStatusPage status={organizationRouteErrorStatus(dashboard.error)} />;
  }
  if (!dashboard.data) return <AppPageLoader label="Loading organization…" />;
  if (!dashboard.data.permissions.canViewOrganization) return <RouteStatusPage status={403} />;

  const isCurrent = context?.currentOrganization.id === id;
  return (
    <OrganizationOverview
      isCurrent={isCurrent}
      organization={dashboard.data.organization}
      permissions={dashboard.data.permissions}
      role={isCurrent ? context?.currentMembership.role : undefined}
      dashboard={dashboard}
      breadcrumbs={[
        { label: "Organizations", to: "/workspace/organizations" },
        { label: dashboard.data.organization.name },
      ]}
    />
  );
}
