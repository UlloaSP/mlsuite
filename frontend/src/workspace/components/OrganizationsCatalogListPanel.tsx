/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import type { Dispatch, SetStateAction } from "react";
import { Search } from "lucide-react";
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
} from "../../app/components";
import {
  ORGANIZATION_CATALOG_PAGE_SIZE,
  useOrganizationCatalogPageQuery,
} from "../../api/workspace/hooks";
import type { OrganizationCatalogItemDto } from "../../api/workspace/dtos";
import { getOrganizationMembers } from "../../api/workspace/services";
import { OrganizationCatalogTile } from "./OrganizationCatalogTile";
import type { OrganizationPatch } from "./OrganizationCatalogEditable";
import type { OrganizationFilterMode, OrganizationSortMode } from "./OrganizationsCatalogToolbar";

export type OrganizationsCatalogListPanelProps = {
  filter: OrganizationFilterMode;
  isActionPending: boolean;
  onDelete: (item: OrganizationCatalogItemDto) => void | Promise<void>;
  onCreate: () => void;
  onPatch: (item: OrganizationCatalogItemDto, patch: OrganizationPatch) => void | Promise<void>;
  onTransferOwner: (item: OrganizationCatalogItemDto, membershipId: number) => void | Promise<void>;
  page: number;
  search: string;
  setPage: Dispatch<SetStateAction<number>>;
  sort: OrganizationSortMode;
};

export function OrganizationsCatalogListPanel({
  filter,
  isActionPending,
  onDelete,
  onCreate,
  onPatch,
  onTransferOwner,
  page,
  search,
  setPage,
  sort,
}: OrganizationsCatalogListPanelProps) {
  const pageQuery = useOrganizationCatalogPageQuery(page, search, sort, filter);
  const items = pageQuery.data?.items ?? [];
  const totalItems = pageQuery.data?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / ORGANIZATION_CATALOG_PAGE_SIZE));
  const loadError = pageQuery.error instanceof Error ? pageQuery.error.message : null;
  const isBusy = pageQuery.isLoading || pageQuery.isFetching || isActionPending;
  const hasActiveFilters = Boolean(search) || filter !== "all";

  return (
    <>
      <section className="min-h-0 flex-1 basis-0 overflow-y-auto py-4">
        <div className="grid gap-3 pr-1">
          {items.length === 0 && pageQuery.isLoading ? (
            <AppPanel className="px-6 py-16 text-center text-sm text-[var(--text-secondary)] md:col-span-2 xl:col-span-3">
              Loading organizations...
            </AppPanel>
          ) : null}
          {items.length === 0 && loadError ? (
            <AppPanel className="space-y-4 px-6 py-16 text-center md:col-span-2 xl:col-span-3">
              <p className="text-sm text-[var(--danger-text)]">{loadError}</p>
              <AppButton type="button" onClick={() => void pageQuery.refetch()} variant="secondary">
                Retry
              </AppButton>
            </AppPanel>
          ) : null}
          {items.length === 0 && !pageQuery.isLoading && !loadError ? (
            <div className="md:col-span-2 xl:col-span-3">
              <AppEmptyState
                icon={<Search size={22} />}
                title={hasActiveFilters ? "No matching organizations" : "No organizations yet"}
                description={
                  hasActiveFilters
                    ? "Try another search term or filter."
                    : "Create the first organization for models, schemas, plugins, and members."
                }
                action={
                  hasActiveFilters ? undefined : (
                    <AppButton type="button" onClick={onCreate}>
                      + New Organization
                    </AppButton>
                  )
                }
              />
            </div>
          ) : null}
          {items.map((item) => (
            <OrganizationCatalogTileWithMembers
              key={item.id}
              disabled={isBusy}
              item={item}
              onDelete={() => onDelete(item)}
              onPatch={(patch) => onPatch(item, patch)}
              onTransferOwner={(membershipId) => onTransferOwner(item, membershipId)}
            />
          ))}
        </div>
      </section>
      <PaginationFooter
        disabled={isBusy}
        hasNext={Boolean(pageQuery.data?.hasNext)}
        page={page}
        setPage={setPage}
        totalPages={totalPages}
      />
    </>
  );
}

function OrganizationCatalogTileWithMembers({
  disabled,
  item,
  onDelete,
  onPatch,
  onTransferOwner,
}: {
  disabled: boolean;
  item: OrganizationCatalogItemDto;
  onDelete: () => void | Promise<void>;
  onPatch: (patch: OrganizationPatch) => void | Promise<void>;
  onTransferOwner: (membershipId: number) => void | Promise<void>;
}) {
  const { data: members = [] } = useQuery({
    queryKey: ["organization-members", item.id],
    queryFn: () => getOrganizationMembers(item.id),
  });
  return (
    <OrganizationCatalogTile
      disabled={disabled}
      item={item}
      members={members}
      onDelete={onDelete}
      onPatch={onPatch}
      onTransferOwner={onTransferOwner}
    />
  );
}

type PaginationFooterProps = {
  disabled: boolean;
  hasNext: boolean;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
};

function PaginationFooter({ disabled, hasNext, page, setPage, totalPages }: PaginationFooterProps) {
  return (
    <div className="shrink-0 border-t border-[var(--border-soft)] bg-[var(--surface-primary)] py-3 text-sm text-[var(--text-secondary)]">
      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              disabled={disabled || page === 0}
              onClick={() => setPage((current) => Math.max(0, current - 1))}
            />
          </PaginationItem>
          {getPaginationPages(page, totalPages).map((item) =>
            item.kind === "ellipsis" ? (
              <PaginationItem key={item.key}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item.page}>
                <PaginationLink
                  disabled={disabled || item.page === page}
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
              disabled={disabled || !hasNext}
              onClick={() => setPage((current) => current + 1)}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

type PaginationPageItem = { kind: "ellipsis"; key: string } | { kind: "page"; page: number };

function getPaginationPages(currentPage: number, totalPages: number): PaginationPageItem[] {
  if (totalPages <= 5)
    return Array.from({ length: totalPages }, (_, page) => ({ kind: "page", page }));
  const lastPage = totalPages - 1;
  if (currentPage <= 2) return pages(0, 1, 2).concat(ellipsis("end"), pages(lastPage));
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
