/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import { toast } from "sonner";
import { AppButton, AppPanel } from "../../../app/components";
import { PluginCatalogListItem } from "./PluginCatalogListItem";
import { TYPE_META, type SortMode, type TypeFilter } from "../plugin-catalog-shared";
import {
  PLUGIN_CATALOG_PAGE_SIZE,
  useDeletePluginMutation,
  usePluginCatalogPageQuery,
} from "../hooks/usePluginCatalogPageData";

type PluginCatalogListPanelProps = {
  canManagePlugins: boolean;
  isUploadPending: boolean;
  onCatalogChanged: () => Promise<void>;
  organizationId: number | string | undefined;
  page: number;
  search: string;
  setPage: Dispatch<SetStateAction<number>>;
  sort: SortMode;
  typeFilter: TypeFilter;
};

export function PluginCatalogListPanel({
  canManagePlugins,
  isUploadPending,
  onCatalogChanged,
  organizationId,
  page,
  search,
  setPage,
  sort,
  typeFilter,
}: PluginCatalogListPanelProps) {
  const pageQuery = usePluginCatalogPageQuery(organizationId, page, typeFilter, search, sort);
  const deleteMutation = useDeletePluginMutation();
  const items = pageQuery.data?.items ?? [];
  const totalItems = pageQuery.data?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PLUGIN_CATALOG_PAGE_SIZE));
  const loadError =
    pageQuery.error instanceof Error
      ? pageQuery.error.message
      : pageQuery.error
        ? String(pageQuery.error)
        : null;
  const isBusy =
    pageQuery.isLoading || pageQuery.isFetching || deleteMutation.isPending || isUploadPending;

  const handleDelete = async (item: (typeof items)[number]) => {
    try {
      await deleteMutation.mutateAsync(item.id);
      if (items.length === 1 && page > 0) {
        setPage((current) => Math.max(0, current - 1));
      }
      await onCatalogChanged();
      toast.success(`${item.fileName} (${TYPE_META[item.pluginType].shortLabel}) deleted from catalog.`);
    } catch (deleteError: unknown) {
      toast.error(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  };

  return (
    <>
      <section className="min-h-0 flex-1 overflow-auto pr-1">
        <div className="space-y-3">
          {items.length === 0 && pageQuery.isLoading ? (
            <AppPanel className="px-6 py-16 text-center text-sm text-[var(--text-secondary)]">
              Loading plugins...
            </AppPanel>
          ) : null}
          {items.length === 0 && loadError ? (
            <AppPanel className="space-y-4 px-6 py-16 text-center">
              <p className="text-sm text-[var(--danger-text)]">{loadError}</p>
              <div>
                <AppButton type="button" onClick={() => void pageQuery.refetch()} variant="secondary">
                  Retry
                </AppButton>
              </div>
            </AppPanel>
          ) : null}
          {items.length === 0 && !pageQuery.isLoading && !loadError ? (
            <AppPanel className="border-dashed px-6 py-16 text-center text-sm text-[var(--text-secondary)]">
              No plugins match current search/filter.
            </AppPanel>
          ) : null}
          {items.map((item, index) => (
            <PluginCatalogListItem
              key={item.id}
              canManage={canManagePlugins}
              index={index}
              isBusy={isBusy}
              item={item}
              onDelete={handleDelete}
            />
          ))}
        </div>
      </section>
      <AppPanel className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 text-sm text-[var(--text-secondary)]">
        <span>
          Page {page + 1} of {totalPages}. {totalItems} matching plugin
          {totalItems !== 1 ? "s" : ""}.
        </span>
        <div className="flex items-center gap-2">
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={isBusy || page === 0}
          >
            <ChevronLeft size={16} />
            Previous
          </AppButton>
          <AppButton
            type="button"
            variant="secondary"
            onClick={() => setPage((current) => current + 1)}
            disabled={isBusy || !pageQuery.data?.hasNext}
          >
            Next
            <ChevronRight size={16} />
          </AppButton>
        </div>
      </AppPanel>
    </>
  );
}
