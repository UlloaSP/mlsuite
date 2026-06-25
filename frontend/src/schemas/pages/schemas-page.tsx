/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  SCHEMA_CATALOG_PAGE_SIZE,
  useArchiveSchemaMutation,
  useDeleteSchemaMutation,
  useDuplicateSchemaMutation,
  useRenameSchemaMutation,
  useSchemaCatalogPageQuery,
} from "../../api/schemas/hooks";
import type { SchemaDto } from "../../api/schemas/dtos";
import { useUser } from "../../api/user/hooks";
import { useWorkspaceContext } from "../../api/workspace/hooks";
import { AppButton, CatalogResourcePage, useCatalogControls } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import type { SchemaAction } from "../components/SchemaActionsMenu";
import { SchemaListItem } from "../components/SchemaListItem";

type SchemaSortMode = "updated" | "created" | "name";
type SchemaStatusFilter = "active" | "archived" | "all";

const STATUS_FILTERS: Array<{ value: SchemaStatusFilter; label: string }> = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const SORT_OPTIONS: Array<{ value: SchemaSortMode; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "created", label: "Latest created" },
  { value: "name", label: "Name" },
];

export function SchemasPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const organizationId = workspace?.currentOrganization.id;
  const controls = useCatalogControls<SchemaStatusFilter, SchemaSortMode>({
    initialFilter: "active",
    initialSort: "updated",
    resetKey: organizationId,
  });
  const renameMutation = useRenameSchemaMutation();
  const archiveMutation = useArchiveSchemaMutation();
  const deleteMutation = useDeleteSchemaMutation();
  const duplicateMutation = useDuplicateSchemaMutation();
  const pageQuery = useSchemaCatalogPageQuery(
    organizationId,
    controls.page,
    controls.search,
    controls.sort,
    controls.filter,
  );

  const canCreateSchemas = workspace?.permissions.canEditModels ?? false;
  const canDeleteSchemas = workspace?.permissions.canDeleteModels ?? false;
  const canEditSchemas = workspace?.permissions.canEditModels ?? false;

  const handleAction = async (action: SchemaAction, schema: SchemaDto) => {
    try {
      if (action === "edit") await renameSchema(schema);
      if (action === "duplicate") await duplicateSchema(schema);
      if (action === "archive" && window.confirm(`Archive ${schema.name}?`)) {
        await archiveMutation.mutateAsync(schema.id);
        toast.success("Schema archived.");
      }
      if (action === "delete" && window.confirm(`Delete ${schema.name}? This cannot be undone.`)) {
        await deleteMutation.mutateAsync(schema.id);
        toast.success("Schema deleted.");
      }
    } catch (actionError: unknown) {
      toast.error(actionError instanceof Error ? actionError.message : String(actionError));
    }
  };
  const renameSchema = async (schema: SchemaDto) => {
    const name = window.prompt("Schema name", schema.name)?.trim();
    if (!name) return;
    await renameMutation.mutateAsync({ id: schema.id, name });
    toast.success("Schema renamed.");
  };
  const duplicateSchema = async (schema: SchemaDto) => {
    const name = window.prompt("Copy name", `${schema.name} Copy`)?.trim();
    if (!name) return;
    await duplicateMutation.mutateAsync({ id: schema.id, name });
    toast.success("Schema duplicated.");
  };

  const isActionPending =
    renameMutation.isPending ||
    archiveMutation.isPending ||
    deleteMutation.isPending ||
    duplicateMutation.isPending;

  return (
    <CatalogResourcePage
      accessDenied={
        !user || Boolean(error) || Boolean(workspace && !workspace.permissions.canViewModels)
      }
      accessFallback={<NotFoundError />}
      controls={controls}
      header={{
        eyebrow: "Schemas",
        title: "Schemas",
        breadcrumbs: [{ label: "Workspace", to: "/workspace" }, { label: "Schemas" }],
        description: `Navigate schema snapshots for ${
          workspace?.currentOrganization.name ?? "the current workspace"
        }.`,
        actions: canCreateSchemas ? (
          <AppButton type="button" onClick={() => navigate("/schemas/create")}>
            + New Schema
          </AppButton>
        ) : null,
      }}
      isActionPending={isActionPending}
      loadingLabel="Loading schemas..."
      pageSize={SCHEMA_CATALOG_PAGE_SIZE}
      filterLabel="Filter by schema status"
      filters={STATUS_FILTERS}
      placeholder="Search by name or description"
      query={pageQuery}
      sortLabel="Sort schemas"
      sortOptions={SORT_OPTIONS}
      emptyIcon={<Search size={22} />}
      emptyTitle="No schemas yet"
      filteredEmptyTitle="No matching schemas"
      emptyDescription="Create your first schema from generated model snapshots."
      filteredEmptyDescription="Try another search term or status."
      emptyAction={
        canCreateSchemas ? (
          <AppButton type="button" onClick={() => navigate("/schemas/create")}>
            + New Schema
          </AppButton>
        ) : undefined
      }
      renderItem={(schema) => (
        <SchemaListItem
          key={schema.id}
          canDelete={canDeleteSchemas}
          canEdit={canEditSchemas}
          item={schema}
          onOpen={() => navigate(`/schemas/${schema.id}`)}
          onAction={(action) => {
            void handleAction(action, schema);
          }}
        />
      )}
    />
  );
}
