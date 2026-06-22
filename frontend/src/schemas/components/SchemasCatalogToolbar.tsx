/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { AppSelect, AppTextField, cx } from "../../app/components";
import { useSchemaCatalogPageQuery } from "../../api/schemas/hooks";

export type SchemaSortMode = "updated" | "created" | "name";
export type SchemaStatusFilter = "active" | "archived" | "all";

export type SchemasCatalogToolbarProps = {
  organizationId: number | string | undefined;
  page: number;
  query: string;
  search: string;
  setQuery: (value: string) => void;
  setSort: (value: SchemaSortMode) => void;
  setStatus: (value: SchemaStatusFilter) => void;
  sort: SchemaSortMode;
  status: SchemaStatusFilter;
};

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

export function SchemasCatalogToolbar({
  organizationId,
  page,
  query,
  search,
  setQuery,
  setSort,
  setStatus,
  sort,
  status,
}: SchemasCatalogToolbarProps) {
  const { data } = useSchemaCatalogPageQuery(organizationId, page, search, sort, status);

  return (
    <div className="grid gap-3 border-b border-[var(--border-soft)] py-3">
      <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-center">
        <AppTextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or description"
          prefix={<Search size={16} className="text-[var(--text-muted)]" />}
          suffix={
            <span className="shrink-0 whitespace-nowrap border-l border-[var(--border-soft)] pl-3 text-sm font-semibold text-[var(--text-secondary)]">
              {data?.totalItems ?? 0} results
            </span>
          }
        />
        <fieldset className="flex w-fit gap-1">
          <legend className="sr-only">Filter by schema status</legend>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={status === filter.value}
              onClick={() => setStatus(filter.value)}
              className={cx(
                "rounded border px-3 py-1.5 text-sm font-semibold transition",
                status === filter.value
                  ? "border-[var(--text-primary)] bg-[var(--surface-primary)] text-[var(--text-primary)]"
                  : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {filter.label}
            </button>
          ))}
        </fieldset>
        <AppSelect
          aria-label="Sort schemas"
          id="schema-catalog-sort"
          value={sort}
          onValueChange={(nextSort) => setSort(nextSort as SchemaSortMode)}
          className="w-fit bg-transparent px-2 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          options={SORT_OPTIONS}
        />
      </div>
    </div>
  );
}
