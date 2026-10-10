/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { emitErrorFromUnknown } from "@/shared/api/error-notifications";
import {
  useDeleteOrganizationMutation,
  useTransferOrganizationOwnershipMutation,
  useUpdateOrganizationMutation,
} from "@/features/workspace/api/workspace.mutations";
import { useOrganizationCatalogPageQuery } from "@/features/workspace/api/workspace.queries";
import { useUser } from "@/capabilities/workspace-context/session";
import { AppButton } from "@/shared/ui/AppButton";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import type { OrganizationPatch } from "@/features/workspace/components/OrganizationCatalogEditable";
import { OrganizationCatalogTile } from "@/features/workspace/components/OrganizationCatalogTile";
import type { OrganizationCatalogItemDto } from "@/shared/api/openapi.gen";

type OrganizationSortMode = "updated" | "created" | "name";
type OrganizationFilterMode = "all";

const FILTERS: Array<{ value: OrganizationFilterMode; label: string }> = [
  { value: "all", label: "All" },
];

/**
 * The organization mutations report errors locally because the settings page shows them inline;
 * here they are reported as toasts and rethrown so the tile keeps its dialog or draft open.
 */
const withFeedback = async (action: Promise<unknown>, success: string) => {
  try {
    await action;
    toast.success(success);
  } catch (error) {
    emitErrorFromUnknown(error);
    throw error;
  }
};

const SORT_OPTIONS: Array<{ value: OrganizationSortMode; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "created", label: "Latest created" },
  { value: "name", label: "Name" },
];

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const controls = useCatalogControls<OrganizationFilterMode, OrganizationSortMode>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "updated",
    sorts: SORT_OPTIONS.map(({ value }) => value),
  });
  const updateMutation = useUpdateOrganizationMutation();
  const deleteMutation = useDeleteOrganizationMutation();
  const transferMutation = useTransferOrganizationOwnershipMutation();
  const canView = user?.systemRole === "SUPERADMIN";
  const pageQuery = useOrganizationCatalogPageQuery(controls.search, controls.sort, canView);
  const deleteOrganization = (organization: OrganizationCatalogItemDto) =>
    withFeedback(deleteMutation.mutateAsync(organization.id), "Organization deleted.");
  const patchOrganization = (organization: OrganizationCatalogItemDto, patch: OrganizationPatch) =>
    withFeedback(
      updateMutation.mutateAsync({
        id: organization.id,
        name: patch.name ?? organization.name,
        slug: patch.slug ?? organization.slug,
        description: patch.description ?? organization.description ?? undefined,
      }),
      "Organization updated.",
    );
  const transferOwner = (organization: OrganizationCatalogItemDto, membershipId: number) =>
    withFeedback(
      transferMutation.mutateAsync({
        organizationId: organization.id,
        nextOwnerMembershipId: membershipId,
      }),
      "Owner transferred.",
    );

  const isActionPending =
    updateMutation.isPending || deleteMutation.isPending || transferMutation.isPending;
  const isBusy = pageQuery.isLoading || pageQuery.isFetching || isActionPending;

  return (
    <CatalogResourcePage
      accessDenied={!canView || Boolean(error)}
      accessFallback={<NotFoundError />}
      controls={controls}
      header={{
        title: "Organizations",
        breadcrumbs: [{ label: "Organizations" }],
        description: "Search, review, and maintain organization workspaces.",
        actions: (
          <AppButton type="button" onClick={() => navigate("/workspace/organizations/create")}>
            <Plus size={16} /> New organization
          </AppButton>
        ),
      }}
      isActionPending={isActionPending}
      loadingLabel="Loading organizations…"
      filterLabel="Filter organizations"
      filters={FILTERS}
      placeholder="Search by name, slug, or description"
      query={pageQuery}
      sortLabel="Sort organizations"
      sortOptions={SORT_OPTIONS}
      emptyIcon={<Search size={22} />}
      emptyTitle="No organizations yet"
      filteredEmptyTitle="No matching organizations"
      emptyDescription="Create the first organization for models, schemas, plugins, and members."
      filteredEmptyDescription="Try another search term."
      emptyAction={
        <AppButton type="button" onClick={() => navigate("/workspace/organizations/create")}>
          <Plus size={16} /> New organization
        </AppButton>
      }
      renderItem={(item) => (
        <OrganizationCatalogTile
          key={item.id}
          disabled={isBusy}
          item={item}
          onDelete={() => deleteOrganization(item)}
          onPatch={(patch) => patchOrganization(item, patch)}
          onTransferOwner={(membershipId) => transferOwner(item, membershipId)}
        />
      )}
    />
  );
}
