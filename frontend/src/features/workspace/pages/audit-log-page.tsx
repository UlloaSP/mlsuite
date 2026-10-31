/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useParams } from "react-router";
import { useOrganizationAdminDashboardQuery } from "@/features/workspace/api/workspace.queries";
import { AuditLog } from "@/features/workspace/components/AuditLog";
import { organizationRouteErrorStatus } from "@/features/workspace/lib/organization-route-error";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";

/** Who did what in the organization, for roles that may read it. */
export function AuditLogPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const dashboard = useOrganizationAdminDashboardQuery(id);

  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (dashboard.isError)
    return <RouteStatusPage status={organizationRouteErrorStatus(dashboard.error)} />;
  if (dashboard.data && !dashboard.data.permissions.canViewAuditLog)
    return <RouteStatusPage status={403} />;

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title="Audit log"
          description="Who did what here and when: people, API clients, public visitors, platform administrators and the system's own work. Entries are kept for 7 days by default."
          breadcrumbs={[{ label: "Audit log" }]}
        />
        {dashboard.data ? (
          <AuditLog key={id} organizationId={id} />
        ) : (
          <AppLoadingState label="Loading the audit log…" />
        )}
      </AppSurface>
    </AppPage>
  );
}
