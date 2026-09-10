import { Search } from "lucide-react";
import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { AppTextField } from "@/shared/ui/AppTextField";
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
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const role = params.get("role") ?? "ALL";
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
  const setFilter = (key: string, value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value && value !== "ALL") next.set(key, value);
        else next.delete(key);
        next.delete("page");
        return next;
      },
      { replace: true },
    );

  if (!Number.isFinite(id)) return <RouteStatusPage status={404} />;
  if (dashboard.isError)
    return <RouteStatusPage status={organizationRouteErrorStatus(dashboard.error)} />;
  if (dashboard.data && !dashboard.data.permissions.canViewMembers)
    return <RouteStatusPage status={403} />;

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AppPageHeader
          title="Members"
          description="Organization users, roles, and row-level permissions."
          breadcrumbs={[{ label: "Workspace", to: "/workspace" }, { label: "Members" }]}
        />
        <AppToolbar variant="flat">
          <AppTextField
            className="min-w-[min(100%,260px)] flex-1"
            aria-label="Search members"
            placeholder="Search members by name or email..."
            prefix={<Search className="size-4 text-[var(--text-muted)]" />}
            suffix={
              membersQuery.isSuccess ? (
                <span className="shrink-0 whitespace-nowrap border-l border-[var(--border-soft)] pl-3 text-sm font-semibold text-[var(--text-secondary)]">
                  {query || role !== "ALL"
                    ? `${filtered.length} of ${members.length}`
                    : members.length}{" "}
                  members
                </span>
              ) : undefined
            }
            value={query}
            onChange={(event) => setFilter("q", event.target.value)}
          />
          <AppSelect
            aria-label="Filter by role"
            className="min-w-44"
            value={role}
            onValueChange={(value) => setFilter("role", value)}
            options={[{ value: "ALL", label: "All roles" }, ...roles]}
          />
        </AppToolbar>
        <CatalogListPanel
          {...pagination}
          itemCount={filtered.length}
          isLoading={loading}
          isBusy={loading || membersQuery.isFetching}
          loadingLabel="Loading members..."
          errorMessage={membersQuery.isError ? "Could not load members." : null}
          onRetry={() => {
            void membersQuery.refetch();
          }}
          emptyState={{
            title: query || role !== "ALL" ? "No matching members" : "No members yet",
            description:
              query || role !== "ALL"
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
      </AppSurface>
    </AppPage>
  );
}
