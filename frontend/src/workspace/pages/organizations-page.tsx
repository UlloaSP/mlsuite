/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { OrganizationCatalogItemDto } from "../../api/workspace/dtos";
import {
  ORGANIZATION_CATALOG_PAGE_SIZE,
  useDeleteOrganizationMutation,
  useOrganizationCatalogPageQuery,
  useRenameOrganizationMutation,
  useTransferOrganizationOwnershipMutation,
} from "../../api/workspace/hooks";
import { useUser } from "../../api/user/hooks";
import { AppButton, CatalogResourcePage, useCatalogControls } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import type { OrganizationPatch } from "../components/OrganizationCatalogEditable";
import { OrganizationCatalogTileWithMembers } from "../components/OrganizationCatalogTileWithMembers";

type OrganizationSortMode = "updated" | "created" | "name";
type OrganizationFilterMode = "all" | "public" | "private";

const FILTERS: Array<{ value: OrganizationFilterMode; label: string }> = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
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
    initialFilter: "all",
    initialSort: "updated",
  });
  const renameMutation = useRenameOrganizationMutation();
  const deleteMutation = useDeleteOrganizationMutation();
  const transferMutation = useTransferOrganizationOwnershipMutation();
  const canView = user?.systemRole === "SUPERADMIN";
  const pageQuery = useOrganizationCatalogPageQuery(
    controls.page,
    controls.search,
    controls.sort,
    controls.filter,
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
      filteredEmptyDescription="Try another search term or filter."
      emptyAction={
        <AppButton type="button" onClick={() => navigate("/workspace/organizations/create")}>
          + New Organization
        </AppButton>
      }
      renderItem={(item) => (
        <OrganizationCatalogTileWithMembers
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
