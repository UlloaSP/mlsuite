import { useMemo } from "react";
import { useParams } from "react-router";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useClientCatalogPage } from "@/shared/ui/catalog/useClientCatalogPage";
import { RouteStatusPage } from "@/shared/ui/RouteStatusPage";
import {
  useRemoveOrganizationMemberMutation,
  useUpdateOrganizationMemberRoleMutation,
} from "@/features/workspace/api/member.mutations";
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
  const filters = useUrlFilters({ q: "", role: "ALL" });
  const { q: query, role } = filters.values;
  const membersQuery = useOrganizationMembersQuery(
    id,
    Boolean(dashboard.data?.permissions.canViewMembers),
  );
  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const removeMember = useRemoveOrganizationMemberMutation(id);
  const updateMemberRole = useUpdateOrganizationMemberRoleMutation(id);
  const roles = useMemo(
    () =>
      Array.from(
        new Map(
          members.map(({ role }) => [
            String(role.id ?? role.name),
            { value: String(role.id ?? role.name), label: role.name },
          ]),
        ).values(),
      ).sort((a, b) => a.label.localeCompare(b.label)),
    [members],
  );
  const filtered = useMemo(
    () =>
      members.filter((member) => {
        const text = `${member.fullName} ${member.email}`.toLowerCase();
        return (
          text.includes(query.trim().toLowerCase()) &&
          (role === "ALL" || String(member.role.id ?? member.role.name) === role)
        );
      }),
    [members, query, role],
  );
  const loading = dashboard.isPending || membersQuery.isPending;
  const pagination = useClientCatalogPage(
    filtered,
    `${id}:${query}:${role}`,
    !membersQuery.isSuccess,
  );

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
                      shown: filtered.length,
                      total: members.length,
                      filtered: filters.isFiltered,
                      noun: "members",
                    }
                  : undefined
              }
              value={query}
              onChange={(value) => filters.setFilters({ q: value })}
            />
            <AppSelect
              aria-label="Filter by role"
              className="min-w-44"
              value={role}
              onValueChange={(value) => filters.setFilters({ role: value })}
              options={[{ value: "ALL", label: "All roles" }, ...roles]}
            />
          </AppToolbar>
          <CatalogListPanel
            {...pagination}
            itemCount={filtered.length}
            isLoading={loading}
            isBusy={loading || membersQuery.isFetching}
            loadingLabel="Loading members…"
            errorMessage={membersQuery.isError ? "Could not load members." : null}
            onRetry={() => {
              void membersQuery.refetch();
            }}
            emptyState={{
              title: filters.isFiltered ? "No matching members" : "No members yet",
              description: filters.isFiltered
                ? "Try another name, email, or role."
                : "Organization members will appear here.",
            }}
          >
            {pagination.visibleItems.length > 0 ? (
              <MemberTable
                rows={pagination.visibleItems}
                onRoleChange={(membershipId, roleDefinitionId) => {
                  updateMemberRole.mutate({ membershipId, roleDefinitionId });
                }}
                onRemove={(membershipId) => {
                  removeMember.mutate(membershipId);
                }}
              />
            ) : null}
          </CatalogListPanel>
        </section>
      </AppSurface>
    </AppPage>
  );
}
