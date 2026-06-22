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
import { useWorkspaceContext } from "../../api/workspace/hooks";
import {
  useArchiveSchemaMutation,
  useDeleteSchemaMutation,
  useDuplicateSchemaMutation,
  useRenameSchemaMutation,
} from "../../api/schemas/hooks";
import type { SchemaDto } from "../../api/schemas/dtos";
import type { SchemaAction } from "../components/SchemaActionsMenu";
import { SchemasCatalogBrowser } from "../components/SchemasCatalogBrowser";
import type { SchemaSortMode, SchemaStatusFilter } from "../components/SchemasCatalogToolbar";

export function SchemasPage() {
  const navigate = useNavigate();
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const organizationId = workspace?.currentOrganization.id;
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());
  const [sort, setSort] = useState<SchemaSortMode>("updated");
  const [status, setStatus] = useState<SchemaStatusFilter>("active");
  const [pageState, setPageState] = useState({ organizationId, page: 0 });
  const page = pageState.organizationId === organizationId ? pageState.page : 0;
  const renameMutation = useRenameSchemaMutation();
  const archiveMutation = useArchiveSchemaMutation();
  const deleteMutation = useDeleteSchemaMutation();
  const duplicateMutation = useDuplicateSchemaMutation();

  if (!user || error) return <NotFoundError />;
  if (workspace && !workspace.permissions.canViewModels) return <NotFoundError />;

  const canCreateSchemas = workspace?.permissions.canEditModels ?? false;
  const canDeleteSchemas = workspace?.permissions.canDeleteModels ?? false;
  const canEditSchemas = workspace?.permissions.canEditModels ?? false;

  const handleQueryChange = (value: string) => {
    setCatalogPage(0);
    setQuery(value);
  };

  const handleSortChange = (value: SchemaSortMode) => {
    setCatalogPage(0);
    setSort(value);
  };

  const handleStatusChange = (value: SchemaStatusFilter) => {
    setCatalogPage(0);
    setStatus(value);
  };

  const setCatalogPage = (nextPage: SetStateAction<number>) => {
    setPageState((current) => {
      const currentPage = current.organizationId === organizationId ? current.page : 0;
      return {
        organizationId,
        page: typeof nextPage === "function" ? nextPage(currentPage) : nextPage,
      };
    });
  };

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
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-hidden">
        <AppPageHeader
          eyebrow="Schemas"
          title="Schemas"
          description={`Navigate schema snapshots for ${workspace?.currentOrganization.name ?? "the current workspace"}.`}
          actions={
            canCreateSchemas ? (
              <AppButton type="button" onClick={() => navigate("/schemas/create")}>
                + New Schema
              </AppButton>
            ) : null
          }
        />
        <SchemasCatalogBrowser
          toolbar={{
            organizationId,
            page,
            query,
            search: deferredQuery,
            setQuery: handleQueryChange,
            setSort: handleSortChange,
            setStatus: handleStatusChange,
            sort,
            status,
          }}
          list={{
            canCreateSchemas,
            canDeleteSchemas,
            canEditSchemas,
            isActionPending,
            onAction: handleAction,
            onCreateSchema: () => navigate("/schemas/create"),
            onOpenSchema: (schema) => navigate(`/schemas/${schema.id}`),
            organizationId,
            page,
            search: deferredQuery,
            setPage: setCatalogPage,
            sort,
            status,
          }}
        />
      </AppSurface>
    </AppPage>
  );
}
