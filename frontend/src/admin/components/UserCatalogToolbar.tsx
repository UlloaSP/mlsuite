/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Search } from "lucide-react";
import { AppSelect, AppTextField, cx } from "../../app/components";

export type UserRoleFilter = "all" | "USER" | "SUPERADMIN";
export type UserSortMode = "current" | "name" | "newest" | "oldest";

const FILTERS: Array<{ value: UserRoleFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "USER", label: "User" },
  { value: "SUPERADMIN", label: "Superadmin" },
];

const SORT_OPTIONS: Array<{ value: UserSortMode; label: string }> = [
  { value: "current", label: "Current order" },
  { value: "name", label: "Name" },
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
];

export function UserCatalogToolbar({
  filter,
  query,
  resultCount,
  setFilter,
  setQuery,
  setSort,
  sort,
}: {
  filter: UserRoleFilter;
  query: string;
  resultCount: number;
  setFilter: (value: UserRoleFilter) => void;
  setQuery: (value: string) => void;
  setSort: (value: UserSortMode) => void;
  sort: UserSortMode;
}) {
  return (
    <div className="grid gap-3 border-b border-[var(--border-soft)] py-3">
      <div className="flex flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(220px,1fr)_auto_auto] lg:items-center">
        <AppTextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name or email"
          prefix={<Search size={16} className="text-[var(--text-muted)]" />}
          suffix={
            <span className="shrink-0 whitespace-nowrap border-l border-[var(--border-soft)] pl-3 text-sm font-semibold text-[var(--text-secondary)]">
              {resultCount} results
            </span>
          }
        />
        <fieldset className="flex w-fit gap-1">
          <legend className="sr-only">Filter users by role</legend>
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
          aria-label="Sort users"
          value={sort}
          onValueChange={(nextSort) => setSort(nextSort as UserSortMode)}
          className="w-fit bg-transparent px-2 py-2 text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
          options={SORT_OPTIONS}
        />
      </div>
    </div>
  );
}
