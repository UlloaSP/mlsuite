/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { AppSelect, AppTextField, cx } from "../../app/components";
import { useOrganizationCatalogPageQuery } from "../../api/workspace/hooks";

export type OrganizationSortMode = "updated" | "created" | "name";
export type OrganizationFilterMode = "all" | "public" | "private";

export type OrganizationsCatalogToolbarProps = {
  filter: OrganizationFilterMode;
  page: number;
  query: string;
  search: string;
  setFilter: (value: OrganizationFilterMode) => void;
  setQuery: (value: string) => void;
  setSort: (value: OrganizationSortMode) => void;
  sort: OrganizationSortMode;
};

const FILTERS: Array<{ value: OrganizationFilterMode; label: string }> = [
  { value: "all", label: "All" },
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

const SORT_OPTIONS: Array<{ value: OrganizationSortMode; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "created", label: "Latest created" },
  { value: "name", label: "Name" },
];

export function OrganizationsCatalogToolbar({
  filter,
  page,
  query,
  search,
  setFilter,
  setQuery,
  setSort,
  sort,
}: OrganizationsCatalogToolbarProps) {
  const { data } = useOrganizationCatalogPageQuery(page, search, sort, filter);

  return (
    <div className="grid gap-3 border-b border-[var(--border-soft)] py-3">
      <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-center">
        <AppTextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, slug, or description"
          prefix={<Search size={16} className="text-[var(--text-muted)]" />}
          suffix={
            <span className="shrink-0 whitespace-nowrap border-l border-[var(--border-soft)] pl-3 text-sm font-semibold text-[var(--text-secondary)]">
              {data?.totalItems ?? 0} results
            </span>
          }
        />
        <fieldset className="flex w-fit gap-1">
          <legend className="sr-only">Filter organizations</legend>
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              aria-pressed={filter === item.value}
              onClick={() => setFilter(item.value)}
              className={cx(
                "rounded border px-3 py-1.5 text-sm font-semibold transition",
                filter === item.value
                  ? "border-[var(--text-primary)] bg-[var(--surface-primary)] text-[var(--text-primary)]"
                  : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
              )}
            >
              {item.label}
            </button>
          ))}
        </fieldset>
        <AppSelect
          aria-label="Sort organizations"
          id="organization-catalog-sort"
          value={sort}
          onValueChange={(nextSort) => setSort(nextSort as OrganizationSortMode)}
          className="w-fit bg-transparent px-2 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          options={SORT_OPTIONS}
        />
      </div>
    </div>
  );
}
