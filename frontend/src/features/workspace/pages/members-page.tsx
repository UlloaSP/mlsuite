import { useParams } from "react-router";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { MemberRoleFilter } from "@/features/workspace/components/MemberRoleFilter";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useMemberCatalog } from "@/features/workspace/api/workspace-catalog-queries";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import {
  useRemoveOrganizationMemberMutation,
  useUpdateOrganizationMemberRoleMutation,
} from "@/features/workspace/api/member.mutations";
import { MemberTable } from "@/features/workspace/components/MemberTable";
import { useOrganizationAdminDashboardQuery } from "@/features/workspace/api/workspace.queries";
import { organizationRouteErrorStatus } from "@/features/workspace/lib/organization-route-error";

export function MembersPage() {
  const { organizationId = "" } = useParams();
  const id = Number(organizationId);
  const dashboard = useOrganizationAdminDashboardQuery(id);
  const filters = useUrlFilters({ q: "", role: "ALL" });
  const { q: query, role } = filters.values;
  const search = useDebouncedValue(query.trim());
  const membersQuery = useMemberCatalog(
    id,
    { search, filter: role },
    Boolean(dashboard.data?.permissions.canViewMembers),
  );
  const members = membersQuery.data?.items ?? [];
  const removeMember = useRemoveOrganizationMemberMutation(id);
  const updateMemberRole = useUpdateOrganizationMemberRoleMutation(id);
  const loading = dashboard.isPending || membersQuery.isLoading;

  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (dashboard.isError)
    return <RouteStatusPage status={organizationRouteErrorStatus(dashboard.error)} />;
  if (dashboard.data && !dashboard.data.permissions.canViewMembers)
    return <RouteStatusPage status={403} />;

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title="Members"
          description="Organization users, roles, and row-level permissions."
          breadcrumbs={[{ label: "Members" }]}
        />
        <section className="flex min-h-0 flex-1 flex-col">
          <AppToolbar variant="flat">
            <AppSearchField
              className="min-w-[min(100%,260px)] flex-1"
              label="Search members"
              placeholder="Search members by name or email…"
              count={
                membersQuery.isSuccess
                  ? {
                      shown: membersQuery.data?.totalItems ?? 0,
                      total: membersQuery.data?.totalMembers ?? 0,
                      filtered: filters.isFiltered,
                      noun: "members",
                    }
                  : undefined
              }
              value={query}
              onChange={(value) => filters.setFilters({ q: value })}
            />
            <MemberRoleFilter
              organizationId={id}
              value={role}
              onChange={(role) => filters.setFilters({ role })}
            />
          </AppToolbar>
          <CatalogListPanel
            hasNext={Boolean(membersQuery.hasNextPage)}
            onLoadMore={membersQuery.fetchNextPage}
            itemCount={members.length}
            isLoading={loading}
            isBusy={loading || membersQuery.isFetching}
            loadingLabel="Loading members…"
            errorMessage={membersQuery.isError ? "Could not load members." : null}
            onRetry={() => {
              void (membersQuery.isFetchNextPageError
                ? membersQuery.fetchNextPage()
                : membersQuery.refetch());
            }}
            emptyState={{
              title: filters.isFiltered ? "No matching members" : "No members yet",
              description: filters.isFiltered
                ? "Try another name, email, or role."
                : "Organization members will appear here.",
            }}
          >
            {members.map((member) => (
              <MemberTable
                organizationId={id}
                key={member.id}
                rows={[member]}
                onRoleChange={(membershipId, roleDefinitionId) =>
                  updateMemberRole.mutate({ membershipId, roleDefinitionId })
                }
                onRemove={(membershipId) => removeMember.mutate(membershipId)}
              />
            ))}
          </CatalogListPanel>
        </section>
      </AppSurface>
    </AppPage>
  );
}
