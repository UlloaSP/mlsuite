import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
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
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const status = params.get("status") ?? "ALL";
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
  const setFilter = (key: string, value: string) => {
    setSelected([]);
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
  };
  return (
    <>
      <AppToolbar variant="flat">
        <AppTextField
          className="min-w-[min(100%,260px)] flex-1"
          aria-label="Search invitations"
          placeholder="Search invitations by email..."
          prefix={<Search className="size-4 text-[var(--text-muted)]" />}
          suffix={
            request.isSuccess ? (
              <span className="shrink-0 whitespace-nowrap border-l border-[var(--border-soft)] pl-3 text-sm font-semibold text-[var(--text-secondary)]">
                {query || status !== "ALL"
                  ? `${filtered.length} of ${invitations.length}`
                  : invitations.length}{" "}
                {invitations.length === 1 ? "invitation" : "invitations"}
              </span>
            ) : undefined
          }
          value={query}
          onChange={(event) => setFilter("q", event.target.value)}
        />
        <AppSelect
          aria-label="Filter by status"
          className="min-w-44"
          value={status}
          onValueChange={(value) => setFilter("status", value)}
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
        loadingLabel="Loading invitations..."
        errorMessage={request.isError ? "Could not load invitations." : null}
        onRetry={() => {
          void request.refetch();
        }}
        emptyState={{
          title: query || status !== "ALL" ? "No matching invitations" : "No invitations yet",
          description:
            query || status !== "ALL"
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
    </>
  );
}
