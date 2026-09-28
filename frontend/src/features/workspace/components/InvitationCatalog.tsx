import { useMemo, useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useClientCatalogPage } from "@/shared/ui/catalog/useClientCatalogPage";
import { useOrganizationInvitationsQuery } from "@/features/workspace/api/workspace.queries";
import {
  useBulkRevokeInvitationsMutation,
  useResendInvitationMutation,
  useRevokeInvitationMutation,
} from "@/features/workspace/api/invitation.mutations";
import { InvitationCard } from "./InvitationCard";

const statuses = ["ALL", "PENDING", "ACCEPTED", "EXPIRED", "REVOKED"];

export function InvitationCatalog({
  organizationId,
  canManage,
}: {
  organizationId: number;
  canManage: boolean;
}) {
  const filters = useUrlFilters({ q: "", status: "ALL" });
  const { q: query, status } = filters.values;
  const [selected, setSelected] = useState<number[]>([]);
  const request = useOrganizationInvitationsQuery(organizationId);
  const invitations = useMemo(() => request.data ?? [], [request.data]);
  const filtered = useMemo(
    () =>
      invitations.filter(
        (invite) =>
          invite.email.toLowerCase().includes(query.trim().toLowerCase()) &&
          (status === "ALL" || invite.status === status),
      ),
    [invitations, query, status],
  );
  const pagination = useClientCatalogPage(
    filtered,
    `${organizationId}:${query}:${status}`,
    !request.isSuccess,
  );
  const bulkRevoke = useBulkRevokeInvitationsMutation(organizationId);
  const resend = useResendInvitationMutation(organizationId);
  const revoke = useRevokeInvitationMutation(organizationId);
  const selectedVisible = selected.filter((id) =>
    pagination.visibleItems.some((invite) => invite.id === id),
  );
  const setFilter = (changes: { q?: string; status?: string }) => {
    setSelected([]);
    filters.setFilters(changes);
  };
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <AppToolbar variant="flat">
        <AppSearchField
          className="min-w-[min(100%,260px)] flex-1"
          label="Search invitations"
          placeholder="Search invitations by email…"
          count={
            request.isSuccess
              ? {
                  shown: filtered.length,
                  total: invitations.length,
                  filtered: filters.isFiltered,
                  noun: invitations.length === 1 ? "invitation" : "invitations",
                }
              : undefined
          }
          value={query}
          onChange={(value) => setFilter({ q: value })}
        />
        <AppSelect
          aria-label="Filter by status"
          className="min-w-44"
          value={status}
          onValueChange={(value) => setFilter({ status: value })}
          options={statuses.map((value) => ({
            value,
            label:
              value === "ALL" ? "All statuses" : value.charAt(0) + value.slice(1).toLowerCase(),
          }))}
        />
        {canManage && selectedVisible.length > 0 ? (
          <AppButton
            variant="danger"
            disabled={bulkRevoke.isPending}
            onClick={() => void bulkRevoke.mutateAsync(selectedVisible).then(() => setSelected([]))}
          >
            Bulk revoke ({selectedVisible.length})
          </AppButton>
        ) : null}
      </AppToolbar>
      <CatalogListPanel
        {...pagination}
        setPage={(value) => {
          setSelected([]);
          pagination.setPage(value);
        }}
        itemCount={filtered.length}
        isLoading={request.isPending}
        isBusy={request.isFetching}
        loadingLabel="Loading invitations…"
        errorMessage={request.isError ? "Could not load invitations." : null}
        onRetry={() => {
          void request.refetch();
        }}
        emptyState={{
          title: filters.isFiltered ? "No matching invitations" : "No invitations yet",
          description: filters.isFiltered
            ? "Try another email or status."
            : "Invitations will appear here once created.",
        }}
      >
        {pagination.visibleItems.map((invite) => (
          <InvitationCard
            key={invite.id}
            invite={invite}
            canManage={canManage}
            selected={selectedVisible.includes(invite.id)}
            onSelect={(checked) =>
              setSelected((current) =>
                checked ? [...current, invite.id] : current.filter((id) => id !== invite.id),
              )
            }
            onResend={() => resend.mutate(invite.id)}
            onRevoke={() => revoke.mutate(invite.id)}
          />
        ))}
      </CatalogListPanel>
    </section>
  );
}
