import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { useOrganizationAdminDashboardQuery } from "@/features/workspace/api/workspace.queries";
import { OrganizationOverview } from "@/features/workspace/components/overview/OrganizationOverview";

export function WorkspaceHomePage() {
  const { data: context } = useWorkspaceContext();
  const dashboard = useOrganizationAdminDashboardQuery(context?.currentOrganization.id ?? 0);

  if (!context) {
    return null;
  }

  return (
    <OrganizationOverview
      isCurrent
      organization={context.currentOrganization}
      permissions={context.permissions}
      role={context.currentMembership.role}
      dashboard={dashboard}
    />
  );
}
