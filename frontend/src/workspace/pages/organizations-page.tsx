/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useDeferredValue, useState, type SetStateAction } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AppButton, AppPage, AppPageHeader, AppSurface } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { useUser } from "../../api/user/hooks";
import {
  useDeleteOrganizationMutation,
  useRenameOrganizationMutation,
  useTransferOrganizationOwnershipMutation,
} from "../../api/workspace/hooks";
import type { OrganizationCatalogItemDto } from "../../api/workspace/dtos";
import type { OrganizationPatch } from "../components/OrganizationCatalogEditable";
import { OrganizationsCatalogBrowser } from "../components/OrganizationsCatalogBrowser";
import type {
  OrganizationFilterMode,
  OrganizationSortMode,
} from "../components/OrganizationsCatalogToolbar";

export function OrganizationsPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [sort, setSort] = useState<OrganizationSortMode>("updated");
  const [filter, setFilter] = useState<OrganizationFilterMode>("all");
  const [page, setPage] = useState(0);
  const renameMutation = useRenameOrganizationMutation();
  const deleteMutation = useDeleteOrganizationMutation();
  const transferMutation = useTransferOrganizationOwnershipMutation();

  if (!user || error) return <NotFoundError />;
  if (user.systemRole !== "SUPERADMIN") return <NotFoundError />;

  const setCatalogPage = (nextPage: SetStateAction<number>) => {
    setPage((current) =>
      Math.max(0, typeof nextPage === "function" ? nextPage(current) : nextPage),
    );
  };

  const handleQueryChange = (value: string) => {
    setCatalogPage(0);
    setQuery(value);
  };

  const handleSortChange = (value: OrganizationSortMode) => {
    setCatalogPage(0);
    setSort(value);
  };

  const handleFilterChange = (value: OrganizationFilterMode) => {
    setCatalogPage(0);
    setFilter(value);
  };

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

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-hidden">
        <AppPageHeader
          eyebrow="Superadmin"
          title="Organizations"
          breadcrumbs={[{ label: "Organizations" }]}
          description="Search, review, and maintain organization workspaces."
          actions={
            <AppButton type="button" onClick={() => navigate("/workspace/organizations/create")}>
              + New Organization
            </AppButton>
          }
        />
        <OrganizationsCatalogBrowser
          toolbar={{
            filter,
            page,
            query,
            search: deferredQuery,
            setFilter: handleFilterChange,
            setQuery: handleQueryChange,
            setSort: handleSortChange,
            sort,
          }}
          list={{
            filter,
            isActionPending,
            onDelete: deleteOrganization,
            onCreate: () => navigate("/workspace/organizations/create"),
            onPatch: patchOrganization,
            onTransferOwner: transferOwner,
            page,
            search: deferredQuery,
            setPage: setCatalogPage,
            sort,
          }}
        />
      </AppSurface>
    </AppPage>
  );
}
