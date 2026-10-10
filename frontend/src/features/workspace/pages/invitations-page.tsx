import { useParams } from "react-router";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import { AppSurface } from "@/shared/ui/AppSurface";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import { useCreateInvitationMutation } from "@/features/workspace/api/invitation.mutations";
import { InviteForm } from "@/features/workspace/components/InviteForm";
import { useOrganizationAdminDashboardQuery } from "@/features/workspace/api/workspace.queries";
import { organizationRouteErrorStatus } from "@/features/workspace/lib/organization-route-error";
import { InvitationCatalog } from "@/features/workspace/components/InvitationCatalog";

export function InvitationsPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const dashboard = useOrganizationAdminDashboardQuery(id);
  const permissions = dashboard.data?.permissions;
  const create = useCreateInvitationMutation(id);
  const canView = Boolean(permissions?.canViewInvitations);
  const canInvite = Boolean(permissions?.canInviteMembers);
  const canManage = Boolean(permissions?.canManageInvitations);
  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (dashboard.isError)
    return <RouteStatusPage status={organizationRouteErrorStatus(dashboard.error)} />;
  if (dashboard.data && !canView && !canInvite) return <RouteStatusPage status={403} />;

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title="Invitations"
          description="Invite users, assign starting role, and revoke pending access."
          breadcrumbs={[{ label: "Invitations" }]}
        />
        {canInvite ? (
          <section className="border-y border-line py-5">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <AppSectionTitle>Invite member</AppSectionTitle>
                <AppCopy className="mt-1">
                  Search existing users outside this organization and assign their starting access.
                </AppCopy>
              </div>
            </div>
            <InviteForm
              organizationId={id}
              onSubmit={async (payload) => {
                await create.mutateAsync(payload);
              }}
            />
          </section>
        ) : null}
        {canView ? <InvitationCatalog key={id} organizationId={id} canManage={canManage} /> : null}
      </AppSurface>
    </AppPage>
  );
}
