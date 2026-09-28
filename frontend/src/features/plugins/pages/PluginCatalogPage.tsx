/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search, Upload } from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useDeletePluginMutation } from "@/features/plugins/api/plugin.mutations";
import { PLUGIN_CATALOG_PAGE_SIZE } from "@/features/plugins/api/plugin.keys";
import {
  usePluginCatalogPageQuery,
  usePluginCatalogStatsQuery,
} from "@/features/plugins/api/plugin.queries";
import { useUser } from "@/capabilities/workspace-context/session";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import {
  SORT_LABELS,
  TYPE_META,
  type SortMode,
  type TypeFilter,
} from "@/features/plugins/lib/catalog-page-model";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import { PluginCatalogListItem } from "@/features/plugins/components/PluginCatalogListItem";

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
  const organizationId = workspace?.currentOrganization.id;
  const canManagePlugins = workspace?.permissions.canManagePlugins ?? false;
  const controls = useCatalogControls<TypeFilter, SortMode>({
    filters: TYPE_FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "updated",
    resetKey: organizationId,
    sorts: SORT_OPTIONS.map(({ value }) => value),
  });
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

  const actionDialog = useActionDialog();
  const handleDelete = async (item: (typeof items)[number]) => {
    const confirmed = await actionDialog.confirm({
      title: `Delete ${item.kind ?? item.fileName}?`,
      description: "Schemas that use this plugin will no longer render its fields or reports.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    try {
      await deleteMutation.mutateAsync(item.id);
      if (items.length === 1 && controls.page > 0) {
        controls.setPage((current) => current - 1);
      }
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
  const isBusy = pageQuery.isLoading || pageQuery.isFetching || deleteMutation.isPending;

  return (
    <>
      {actionDialog.dialog}
      <CatalogResourcePage
        accessDenied={
          !user || Boolean(error) || Boolean(workspace && !workspace.permissions.canViewPlugins)
        }
        accessFallback={<NotFoundError />}
        controls={controls}
        header={{
          eyebrow: "Workspace extensions",
          title: "Plugins",
          description:
            "View and manage workspace plugins that extend MLForm with custom field and report renderers.",
          breadcrumbs: [{ label: "Plugins" }],
          actions: canManagePlugins ? (
            <Link className={appButtonClass()} to="/plugins/upload">
              <Upload size={16} />
              Upload plugins
            </Link>
          ) : null,
        }}
        isActionPending={deleteMutation.isPending}
        loadingLabel="Loading plugins…"
        pageSize={PLUGIN_CATALOG_PAGE_SIZE}
        filterLabel="Filter by plugin type"
        filterVariant="segmented"
        filters={filters}
        placeholder="Search by file or kind"
        query={pageQuery}
        sortLabel="Sort plugins"
        sortOptions={SORT_OPTIONS}
        emptyIcon={<Search size={22} />}
        emptyTitle="No plugins yet"
        filteredEmptyTitle="No matching plugins"
        emptyDescription="Upload a plugin to extend MLForm with custom fields and reports."
        filteredEmptyDescription="Try another search term or plugin type."
        renderItem={(item) => (
          <PluginCatalogListItem
            key={item.id}
            canManage={canManagePlugins}
            isBusy={isBusy}
            item={item}
            onDelete={handleDelete}
          />
        )}
      />
    </>
  );
}

const filterCount = (filter: TypeFilter, fieldPlugins: number, reportPlugins: number) => {
  if (filter === "field") return fieldPlugins;
  if (filter === "report") return reportPlugins;
  return fieldPlugins + reportPlugins;
};
