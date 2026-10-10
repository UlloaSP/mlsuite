import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useInvitationCatalog } from "@/features/workspace/api/workspace-catalog-queries";
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
  const request = useInvitationCatalog(organizationId, {
    search: useDebouncedValue(query.trim()),
    filter: status.toLowerCase() === "all" ? "all" : status,
  });
  const invitations = request.data?.items ?? [];
  const bulkRevoke = useBulkRevokeInvitationsMutation(organizationId);
  const resend = useResendInvitationMutation(organizationId);
  const revoke = useRevokeInvitationMutation(organizationId);
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
                  shown: request.data.totalItems,
                  total: request.data.totalInvitations,
                  filtered: filters.isFiltered,
                  noun: request.data.totalInvitations === 1 ? "invitation" : "invitations",
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
        {canManage && selected.length > 0 ? (
          <AppButton
            variant="danger"
            disabled={bulkRevoke.isPending}
            onClick={() => void bulkRevoke.mutateAsync(selected).then(() => setSelected([]))}
          >
            Bulk revoke ({selected.length})
          </AppButton>
        ) : null}
      </AppToolbar>
      <CatalogListPanel
        hasNext={Boolean(request.hasNextPage)}
        onLoadMore={request.fetchNextPage}
        itemCount={invitations.length}
        isLoading={request.isPending}
        isBusy={request.isFetching}
        loadingLabel="Loading invitations…"
        errorMessage={request.isError ? "Could not load invitations." : null}
        onRetry={() => {
          void (request.isFetchNextPageError ? request.fetchNextPage() : request.refetch());
        }}
        emptyState={{
          title: filters.isFiltered ? "No matching invitations" : "No invitations yet",
          description: filters.isFiltered
            ? "Try another email or status."
            : "Invitations will appear here once created.",
        }}
      >
        {invitations.map((invite) => (
          <InvitationCard
            key={invite.id}
            invite={invite}
            canManage={canManage}
            selected={selected.includes(invite.id)}
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
