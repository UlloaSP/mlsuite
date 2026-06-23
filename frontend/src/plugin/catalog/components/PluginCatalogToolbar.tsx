/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import type { RefObject } from "react";
import { AppSelect, AppTextField, cx } from "../../../app/components";
import { usePluginCatalogPageQuery, usePluginCatalogStatsQuery } from "../../../api/plugins/hooks";
import {
  SORT_LABELS,
  type SortMode,
  type TypeFilter,
} from "../../../algorithms/plugin/catalog-page-model";

export type PluginCatalogToolbarProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  onFileSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
  organizationId: number | string | undefined;
  page: number;
  query: string;
  search: string;
  setQuery: (value: string) => void;
  setSort: (value: SortMode) => void;
  setTypeFilter: (value: TypeFilter) => void;
  sort: SortMode;
  typeFilter: TypeFilter;
};

const TYPE_FILTERS: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "field", label: "Fields" },
  { value: "report", label: "Reports" },
];

const filterCount = (filter: TypeFilter, fieldPlugins: number, reportPlugins: number) => {
  if (filter === "field") {
    return fieldPlugins;
  }
  if (filter === "report") {
    return reportPlugins;
  }
  return fieldPlugins + reportPlugins;
};

export function PluginCatalogToolbar({
  inputRef,
  onFileSelection,
  organizationId,
  page,
  query,
  search,
  setQuery,
  setSort,
  setTypeFilter,
  sort,
  typeFilter,
}: PluginCatalogToolbarProps) {
  const { data } = usePluginCatalogStatsQuery(organizationId);
  const { data: pageData } = usePluginCatalogPageQuery(
    organizationId,
    page,
    typeFilter,
    search,
    sort,
  );
  const fieldPlugins = data?.fieldPlugins ?? 0;
  const reportPlugins = data?.reportPlugins ?? 0;
  const filteredCount = pageData?.totalItems ?? 0;

  return (
    <div className="grid gap-3 border-b border-[var(--border-soft)] py-3">
      <input
        ref={inputRef}
        type="file"
        accept=".ts,text/typescript,application/typescript,text/plain"
        aria-label="Upload plugin file"
        className="hidden"
        onChange={onFileSelection}
      />
      <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-center">
        <AppTextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by file or kind"
          prefix={<Search size={16} className="text-[var(--text-muted)]" />}
          suffix={
            <span className="shrink-0 whitespace-nowrap border-l border-[var(--border-soft)] pl-3 text-sm font-semibold text-[var(--text-secondary)]">
              {filteredCount} results
            </span>
          }
        />
        <fieldset className="inline-flex w-fit rounded border border-[var(--border-soft)] bg-[var(--surface-muted)] p-1">
          <legend className="sr-only">Filter by plugin type</legend>
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={typeFilter === filter.value}
              onClick={() => setTypeFilter(filter.value)}
              className={cx(
                "rounded px-3 py-1.5 text-sm font-semibold transition",
                typeFilter === filter.value
                  ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {filter.label} ({filterCount(filter.value, fieldPlugins, reportPlugins)})
            </button>
          ))}
        </fieldset>
        <AppSelect
          aria-label="Sort plugins"
          id="plugin-catalog-sort"
          value={sort}
          onValueChange={(nextSort) => setSort(nextSort as SortMode)}
          className="w-fit bg-transparent px-2 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          options={(Object.entries(SORT_LABELS) as Array<[SortMode, string]>).map(
            ([value, label]) => ({ value, label }),
          )}
        />
      </div>
    </div>
  );
}
