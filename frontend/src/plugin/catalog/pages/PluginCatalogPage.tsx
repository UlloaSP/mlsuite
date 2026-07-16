/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search, Upload } from "lucide-react";
import { useSetAtom } from "jotai";
import { useRef, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  PLUGIN_CATALOG_PAGE_SIZE,
  useDeletePluginMutation,
  usePluginCatalogPageQuery,
  usePluginCatalogStatsQuery,
  useUploadPluginMutation,
} from "../../../api/plugins/hooks";
import { useUser } from "../../../api/user/hooks";
import { useWorkspaceContext } from "../../../api/workspace/hooks";
import {
  SORT_LABELS,
  TYPE_META,
  type SortMode,
  type TypeFilter,
  readFileText,
} from "../../../algorithms/plugin/catalog-page-model";
import {
  detectPluginType,
  invalidatePluginCatalog,
} from "../../../algorithms/plugin/catalog-loader";
import { invalidateCustomFieldDefinitions } from "../../../algorithms/plugin/custom-field-catalog";
import { invalidateCustomReportDefinitions } from "../../../algorithms/plugin/custom-report-catalog";
import { AppButton, CatalogResourcePage, useCatalogControls } from "../../../app/components";
import { NotFoundError } from "../../../app/pages/error-page";
import { PluginCatalogListItem } from "../components/PluginCatalogListItem";
import { bumpPluginCatalogVersionAtom } from "../../mlform/plugin-catalog-state";

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "field", label: "Fields" },
  { value: "report", label: "Reports" },
];

const SORT_OPTIONS = (Object.entries(SORT_LABELS) as Array<[SortMode, string]>).map(
  ([value, label]) => ({ value, label }),
);

export function PluginCatalogPage() {
  const { data: user, error } = useUser();
  const { data: workspace } = useWorkspaceContext();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const organizationId = workspace?.currentOrganization.id;
  const canManagePlugins = workspace?.permissions.canManagePlugins ?? false;
  const bumpPluginCatalogVersion = useSetAtom(bumpPluginCatalogVersionAtom);
  const controls = useCatalogControls<TypeFilter, SortMode>({
    initialFilter: "all",
    initialSort: "updated",
    resetKey: organizationId,
  });
  const uploadMutation = useUploadPluginMutation();
  const deleteMutation = useDeletePluginMutation();
  const statsQuery = usePluginCatalogStatsQuery(organizationId);
  const pageQuery = usePluginCatalogPageQuery(
    organizationId,
    controls.page,
    controls.filter,
    controls.search,
    controls.sort,
  );
  const items = pageQuery.data?.items ?? [];

  const refreshPluginRuntime = async () => {
    invalidatePluginCatalog();
    invalidateCustomFieldDefinitions();
    invalidateCustomReportDefinitions();
    bumpPluginCatalogVersion();
  };
  const handleFileSelection = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const source = await readFileText(file);
      const detected = await detectPluginType(source);
      await uploadMutation.mutateAsync(file);
      controls.setPage(0);
      await refreshPluginRuntime();
      toast.success(
        `${file.name} uploaded as ${TYPE_META[detected.pluginType].shortLabel} "${detected.kind}".`,
      );
    } catch (uploadError: unknown) {
      toast.error(uploadError instanceof Error ? uploadError.message : String(uploadError));
    } finally {
      event.target.value = "";
    }
  };
  const handleDelete = async (item: (typeof items)[number]) => {
    try {
      await deleteMutation.mutateAsync(item.id);
      if (items.length === 1 && controls.page > 0) {
        controls.setPage((current) => current - 1);
      }
      await refreshPluginRuntime();
      toast.success(
        `${item.fileName} (${TYPE_META[item.pluginType].shortLabel}) deleted from catalog.`,
      );
    } catch (deleteError: unknown) {
      toast.error(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  };

  const fieldPlugins = statsQuery.data?.fieldPlugins ?? 0;
  const reportPlugins = statsQuery.data?.reportPlugins ?? 0;
  const filters = TYPE_FILTERS.map((filter) => ({
    value: filter.value,
    label: `${filter.label} (${filterCount(filter.value, fieldPlugins, reportPlugins)})`,
  }));
  const isBusy =
    pageQuery.isLoading ||
    pageQuery.isFetching ||
    deleteMutation.isPending ||
    uploadMutation.isPending;

  return (
    <CatalogResourcePage
      accessDenied={
        !user || Boolean(error) || Boolean(workspace && !workspace.permissions.canViewPlugins)
      }
      accessFallback={<NotFoundError />}
      controls={controls}
      header={{
        eyebrow: "Workspace Extensions",
        title: "Plugins",
        description:
          "View and manage workspace plugins that extend MLForm with custom field and report renderers.",
        breadcrumbs: [{ label: "Workspace", to: "/workspace" }, { label: "Plugins" }],
        actions: canManagePlugins ? (
          <AppButton
            disabled={uploadMutation.isPending}
            type="button"
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={16} />
            Upload Plugin
          </AppButton>
        ) : null,
      }}
      isActionPending={deleteMutation.isPending || uploadMutation.isPending}
      loadingLabel="Loading plugins..."
      pageSize={PLUGIN_CATALOG_PAGE_SIZE}
      filterLabel="Filter by plugin type"
      filterVariant="segmented"
      filters={filters}
      placeholder="Search by file or kind"
      query={pageQuery}
      sortLabel="Sort plugins"
      sortOptions={SORT_OPTIONS}
      toolbarChildren={
        <input
          ref={inputRef}
          accept=".ts,text/typescript,application/typescript,text/plain"
          aria-label="Upload plugin file"
          className="hidden"
          type="file"
          onChange={(event) => {
            void handleFileSelection(event);
          }}
        />
      }
      emptyIcon={<Search size={22} />}
      emptyTitle="No plugins yet"
      filteredEmptyTitle="No matching plugins"
      emptyDescription="Upload a plugin to extend MLForm with custom fields and reports."
      filteredEmptyDescription="Try another search term or plugin type."
      renderItem={(item, index) => (
        <PluginCatalogListItem
          key={item.id}
          canManage={canManagePlugins}
          index={index}
          isBusy={isBusy}
          item={item}
          onDelete={handleDelete}
        />
      )}
    />
  );
}

const filterCount = (filter: TypeFilter, fieldPlugins: number, reportPlugins: number) => {
  if (filter === "field") return fieldPlugins;
  if (filter === "report") return reportPlugins;
  return fieldPlugins + reportPlugins;
};
