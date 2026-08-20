/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { OrganizationCatalogItemDto } from "@/features/workspace/api/workspace.types";
import {
  useDeleteOrganizationMutation,
  useRenameOrganizationMutation,
  useTransferOrganizationOwnershipMutation,
} from "@/features/workspace/api/workspace.mutations";
import { ORGANIZATION_CATALOG_PAGE_SIZE } from "@/features/workspace/api/workspace.keys";
import { useOrganizationCatalogPageQuery } from "@/features/workspace/api/workspace.queries";
import { useUser } from "@/capabilities/workspace-context/session";
import { AppButton } from "@/shared/ui/AppButton";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import type { OrganizationPatch } from "@/features/workspace/components/OrganizationCatalogEditable";
import { OrganizationCatalogTile } from "@/features/workspace/components/OrganizationCatalogTile";

type OrganizationSortMode = "updated" | "created" | "name";
type OrganizationFilterMode = "all";

const FILTERS: Array<{ value: OrganizationFilterMode; label: string }> = [
  { value: "all", label: "All" },
];

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
  const renameMutation = useRenameOrganizationMutation();
  const deleteMutation = useDeleteOrganizationMutation();
  const transferMutation = useTransferOrganizationOwnershipMutation();
  const canView = user?.systemRole === "SUPERADMIN";
  const pageQuery = useOrganizationCatalogPageQuery(
    controls.page,
    controls.search,
    controls.sort,
    canView,
  );
  const deleteOrganization = async (organization: OrganizationCatalogItemDto) => {
    try {
      await deleteMutation.mutateAsync(organization.id);
      toast.success("Organization deleted.");
    } catch (actionError: unknown) {
      toast.error(actionError instanceof Error ? actionError.message : String(actionError));
      throw actionError;
    }
  };
  const patchOrganization = async (
    organization: OrganizationCatalogItemDto,
    patch: OrganizationPatch,
  ) => {
    try {
      await renameMutation.mutateAsync({
        id: organization.id,
        name: patch.name ?? organization.name,
        slug: patch.slug ?? organization.slug,
        description: patch.description ?? organization.description,
      });
      toast.success("Organization updated.");
    } catch (actionError: unknown) {
      toast.error(actionError instanceof Error ? actionError.message : String(actionError));
      throw actionError;
    }
  };
  const transferOwner = async (organization: OrganizationCatalogItemDto, membershipId: number) => {
    try {
      await transferMutation.mutateAsync({
        organizationId: organization.id,
        nextOwnerMembershipId: membershipId,
      });
      toast.success("Owner transferred.");
    } catch (actionError: unknown) {
      toast.error(actionError instanceof Error ? actionError.message : String(actionError));
      throw actionError;
    }
  };

  const isActionPending =
    renameMutation.isPending || deleteMutation.isPending || transferMutation.isPending;
  const isBusy = pageQuery.isLoading || pageQuery.isFetching || isActionPending;

  return (
    <CatalogResourcePage
      accessDenied={!canView || Boolean(error)}
      accessFallback={<NotFoundError />}
      controls={controls}
      header={{
        eyebrow: "Superadmin",
        title: "Organizations",
        breadcrumbs: [{ label: "Organizations" }],
        description: "Search, review, and maintain organization workspaces.",
        actions: (
          <AppButton type="button" onClick={() => navigate("/workspace/organizations/create")}>
            + New Organization
          </AppButton>
        ),
      }}
      isActionPending={isActionPending}
      loadingLabel="Loading organizations..."
      pageSize={ORGANIZATION_CATALOG_PAGE_SIZE}
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
          + New Organization
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
