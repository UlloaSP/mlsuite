/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowUpDown, Check, ChevronDown, Search } from "lucide-react";
import type { RefObject } from "react";
import { AppPanel } from "../components/ui";
import { cx } from "../components/ui-utils";
import { AppSelect, AppTextField } from "../components/ui-controls";
import {
  getPluginSummary,
  SORT_LABELS,
  type FilterMode,
  type SortMode,
  type TypeFilter,
} from "./plugin-catalog-shared";

type PluginCatalogToolbarProps = {
  activeCount: number;
  filter: FilterMode;
  inputRef: RefObject<HTMLInputElement | null>;
  isSortOpen: boolean;
  onFileSelection: (event: React.ChangeEvent<HTMLInputElement>) => void;
  query: string;
  selectedTypeActiveCount: number;
  selectedTypeCount: number;
  setFilter: (value: FilterMode) => void;
  setIsSortOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  setQuery: (value: string) => void;
  setSort: (value: SortMode) => void;
  setTypeFilter: (value: TypeFilter) => void;
  sort: SortMode;
  sortMenuRef: RefObject<HTMLDivElement | null>;
  typeFilter: TypeFilter;
};

export function PluginCatalogToolbar({
  activeCount,
  filter,
  inputRef,
  isSortOpen,
  onFileSelection,
  query,
  selectedTypeActiveCount,
  selectedTypeCount,
  setFilter,
  setIsSortOpen,
  setQuery,
  setSort,
  setTypeFilter,
  sort,
  sortMenuRef,
  typeFilter,
}: PluginCatalogToolbarProps) {
  return (
    <AppPanel className="grid gap-3">
      <input
        ref={inputRef}
        type="file"
        accept=".ts,text/typescript,application/typescript,text/plain"
        aria-label="Upload plugin file"
        className="hidden"
        onChange={onFileSelection}
      />
      <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_180px_auto_auto]">
        <AppTextField
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by file or kind"
          prefix={<Search size={16} className="text-[var(--text-muted)]" />}
        />
        <AppSelect
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
          aria-label="Filter by plugin type"
        >
          <option value="all">All types</option>
          <option value="field">Fields</option>
          <option value="report">Reports</option>
        </AppSelect>
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              ["all", "All"],
              ["active", "Active"],
              ["inactive", "Inactive"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cx(
                "rounded-full px-4 py-3 text-sm font-medium transition",
                filter === value
                  ? "bg-[var(--text-primary)] text-[var(--text-inverse)]"
                  : "border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-secondary)] hover:border-[var(--text-primary)] hover:text-[var(--text-primary)]",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div ref={sortMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setIsSortOpen((current) => !current)}
            className="inline-flex min-w-[220px] items-center justify-between gap-3 rounded-full border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-card)] transition hover:border-[var(--text-primary)]"
            aria-haspopup="menu"
            aria-expanded={isSortOpen}
          >
            <span className="inline-flex items-center gap-3">
              <ArrowUpDown size={15} className="text-[var(--text-muted)]" />
              {SORT_LABELS[sort]}
            </span>
            <ChevronDown
              size={16}
              className={cx("text-[var(--text-secondary)] transition", isSortOpen && "rotate-180")}
            />
          </button>
          {isSortOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+0.75rem)] z-20 min-w-[220px] overflow-hidden rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]"
            >
              {(Object.entries(SORT_LABELS) as Array<[SortMode, string]>).map(
                ([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="menuitemradio"
                    aria-checked={sort === value}
                    onClick={() => {
                      setSort(value);
                      setIsSortOpen(false);
                    }}
                    className={cx(
                      "flex w-full items-center justify-between rounded-[18px] px-4 py-3 text-left text-sm font-medium transition",
                      sort === value
                        ? "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]"
                        : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
                    )}
                  >
                    <span>{label}</span>
                    {sort === value ? <Check size={15} /> : null}
                  </button>
                ),
              )}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-sm text-[var(--text-secondary)]">
        <p className="font-medium text-[var(--text-primary)]">
          {getPluginSummary(filter, typeFilter, selectedTypeCount, selectedTypeActiveCount)}
        </p>
        <p>
          {activeCount === 0
            ? "No active plugins. Runtime skips inactive custom kinds."
            : "Active plugins register native kinds before form mount."}
        </p>
      </div>
    </AppPanel>
  );
}
