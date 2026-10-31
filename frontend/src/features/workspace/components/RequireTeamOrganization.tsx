import type { PropsWithChildren } from "react";
import { Plus } from "lucide-react";
import { Link, useParams } from "react-router";
import { useOrganizationAdminDashboardQuery } from "@/features/workspace/api/workspace.queries";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { appButtonClass } from "@/shared/ui/button-styles";

/**
 * Members, invitations, roles and settings exist for organizations people share. A personal
 * account reached by address says so instead of drawing pages the API refuses to act on. Any
 * other outcome of the request is the page's own to show.
 */
export function RequireTeamOrganization({ children }: PropsWithChildren) {
  const { organizationId = "" } = useParams();
  const dashboard = useOrganizationAdminDashboardQuery(Number(organizationId));

  if (dashboard.isPending) return <AppPageLoader label="Loading…" />;
  if (dashboard.data?.organization.kind !== "PERSONAL") return <>{children}</>;

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col justify-center">
        <AppEmptyState
          title="Personal accounts don't have this page"
          description="Members, invitations, roles and settings belong to organizations. Create one to work with other people."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                to="/workspace/organizations/create"
                viewTransition
                className={appButtonClass()}
              >
                <Plus size={16} /> New organization
              </Link>
              <Link
                to="/workspace"
                viewTransition
                className={appButtonClass({ variant: "secondary" })}
              >
                Back to overview
              </Link>
            </div>
          }
        />
      </AppSurface>
    </AppPage>
  );
}
