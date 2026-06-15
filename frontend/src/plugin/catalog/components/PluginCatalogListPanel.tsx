/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Dispatch, SetStateAction } from "react";
import { Search } from "lucide-react";
import { toast } from "sonner";
import {
  AppButton,
  AppEmptyState,
  AppPanel,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../../app/components";
import { PluginCatalogListItem } from "./PluginCatalogListItem";
import { TYPE_META, type SortMode, type TypeFilter } from "../plugin-catalog-shared";
import {
  PLUGIN_CATALOG_PAGE_SIZE,
  useDeletePluginMutation,
  usePluginCatalogPageQuery,
} from "../hooks/usePluginCatalogPageData";

export type PluginCatalogListPanelProps = {
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
  const paginationPages = getPaginationPages(page, totalPages);
  const hasActiveFilters = Boolean(search) || typeFilter !== "all";

  const handleDelete = async (item: (typeof items)[number]) => {
    try {
      await deleteMutation.mutateAsync(item.id);
      if (items.length === 1 && page > 0) {
        setPage((current) => Math.max(0, current - 1));
      }
      await onCatalogChanged();
      toast.success(
        `${item.fileName} (${TYPE_META[item.pluginType].shortLabel}) deleted from catalog.`,
      );
    } catch (deleteError: unknown) {
      toast.error(deleteError instanceof Error ? deleteError.message : String(deleteError));
    }
  };

  return (
    <>
      <section className="min-h-0 flex-1 basis-0 overflow-y-auto py-4">
        <div className="space-y-3 pr-1">
          {items.length === 0 && pageQuery.isLoading ? (
            <AppPanel className="px-6 py-16 text-center text-sm text-[var(--text-secondary)]">
              Loading plugins...
            </AppPanel>
          ) : null}
          {items.length === 0 && loadError ? (
            <AppPanel className="space-y-4 px-6 py-16 text-center">
              <p className="text-sm text-[var(--danger-text)]">{loadError}</p>
              <div>
                <AppButton
                  type="button"
                  onClick={() => void pageQuery.refetch()}
                  variant="secondary"
                >
                  Retry
                </AppButton>
              </div>
            </AppPanel>
          ) : null}
          {items.length === 0 && !pageQuery.isLoading && !loadError ? (
            <AppEmptyState
              icon={<Search size={22} />}
              title={hasActiveFilters ? "No matching plugins" : "No plugins yet"}
              description={
                hasActiveFilters
                  ? "Try another search term or plugin type."
                  : "Upload a plugin to extend MLForm with custom fields and reports."
              }
            />
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
      <div className="shrink-0 border-t border-[var(--border-soft)] bg-[var(--surface-primary)] py-3 text-sm text-[var(--text-secondary)]">
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                disabled={isBusy || page === 0}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              />
            </PaginationItem>
            {paginationPages.map((item) =>
              item.kind === "ellipsis" ? (
                <PaginationItem key={item.key}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item.page}>
                  <PaginationLink
                    disabled={isBusy || item.page === page}
                    isActive={item.page === page}
                    onClick={() => setPage(item.page)}
                  >
                    {item.page + 1}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                disabled={isBusy || !pageQuery.data?.hasNext}
                onClick={() => setPage((current) => current + 1)}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </>
  );
}

type PaginationPageItem = { kind: "ellipsis"; key: string } | { kind: "page"; page: number };

function getPaginationPages(currentPage: number, totalPages: number): PaginationPageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, page) => ({ kind: "page", page }));
  }

  const lastPage = totalPages - 1;
  if (currentPage <= 2) {
    return pages(0, 1, 2).concat(ellipsis("end"), pages(lastPage));
  }

  if (currentPage >= lastPage - 2) {
    return pages(0).concat(ellipsis("start"), pages(lastPage - 2, lastPage - 1, lastPage));
  }

  return pages(0).concat(
    ellipsis("start"),
    pages(currentPage - 1, currentPage, currentPage + 1),
    ellipsis("end"),
    pages(lastPage),
  );
}

function pages(...items: number[]): PaginationPageItem[] {
  return items.map((page) => ({ kind: "page", page }));
}

function ellipsis(key: string): PaginationPageItem[] {
  return [{ kind: "ellipsis", key }];
}
