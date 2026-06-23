/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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
import { SCHEMA_CATALOG_PAGE_SIZE, useSchemaCatalogPageQuery } from "../../api/schemas/hooks";
import type { SchemaDto } from "../../api/schemas/dtos";
import { SchemaListItem } from "./SchemaListItem";
import type { SchemaAction } from "./SchemaActionsMenu";
import type { SchemaSortMode, SchemaStatusFilter } from "./SchemasCatalogToolbar";

export type SchemasCatalogListPanelProps = {
  canCreateSchemas: boolean;
  canDeleteSchemas: boolean;
  canEditSchemas: boolean;
  isActionPending: boolean;
  onAction: (action: SchemaAction, schema: SchemaDto) => void | Promise<void>;
  onCreateSchema: () => void;
  onOpenSchema: (schema: SchemaDto) => void;
  organizationId: number | string | undefined;
  page: number;
  search: string;
  setPage: Dispatch<SetStateAction<number>>;
  sort: SchemaSortMode;
  status: SchemaStatusFilter;
};

export function SchemasCatalogListPanel({
  canCreateSchemas,
  canDeleteSchemas,
  canEditSchemas,
  isActionPending,
  onAction,
  onCreateSchema,
  onOpenSchema,
  organizationId,
  page,
  search,
  setPage,
  sort,
  status,
}: SchemasCatalogListPanelProps) {
  const pageQuery = useSchemaCatalogPageQuery(organizationId, page, search, sort, status);
  const items = pageQuery.data?.items ?? [];
  const totalItems = pageQuery.data?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / SCHEMA_CATALOG_PAGE_SIZE));
  const loadError = pageQuery.error instanceof Error ? pageQuery.error.message : null;
  const isBusy = pageQuery.isLoading || pageQuery.isFetching || isActionPending;
  const hasActiveFilters = Boolean(search) || status !== "active";

  return (
    <>
      <section className="min-h-0 flex-1 basis-0 overflow-y-auto py-4">
        <div className="space-y-3 pr-1">
          {items.length === 0 && pageQuery.isLoading ? (
            <AppPanel className="px-6 py-16 text-center text-sm text-[var(--text-secondary)]">
              Loading schemas...
            </AppPanel>
          ) : null}
          {items.length === 0 && loadError ? (
            <AppPanel className="space-y-4 px-6 py-16 text-center">
              <p className="text-sm text-[var(--danger-text)]">{loadError}</p>
              <AppButton type="button" onClick={() => void pageQuery.refetch()} variant="secondary">
                Retry
              </AppButton>
            </AppPanel>
          ) : null}
          {items.length === 0 && !pageQuery.isLoading && !loadError ? (
            <AppEmptyState
              icon={<Search size={22} />}
              title={hasActiveFilters ? "No matching schemas" : "No schemas yet"}
              description={
                hasActiveFilters
                  ? "Try another search term or status."
                  : "Create your first schema from generated model snapshots."
              }
              action={
                hasActiveFilters || !canCreateSchemas ? undefined : (
                  <AppButton type="button" onClick={onCreateSchema}>
                    + New Schema
                  </AppButton>
                )
              }
            />
          ) : null}
          {items.map((schema) => (
            <SchemaListItem
              key={schema.id}
              canDelete={canDeleteSchemas}
              canEdit={canEditSchemas}
              item={schema}
              onOpen={() => onOpenSchema(schema)}
              onAction={(action) => {
                void onAction(action, schema);
              }}
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
