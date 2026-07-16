/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { AppSelect } from "../AppSelect";
import { AppTextField } from "../AppTextField";
import { cx } from "../cx";

export type CatalogOption<TValue extends string> = {
  disabled?: boolean;
  label: string;
  value: TValue;
};

export type CatalogToolbarProps<TFilter extends string, TSort extends string> = {
  children?: ReactNode;
  filter: TFilter;
  filterLabel: string;
  filterVariant?: "buttons" | "segmented";
  filters: Array<CatalogOption<TFilter>>;
  onFilterChange: (value: TFilter) => void;
  onQueryChange: (value: string) => void;
  onSortChange: (value: TSort) => void;
  placeholder: string;
  query: string;
  resultCount: number;
  sort: TSort;
  sortLabel: string;
  sortOptions: Array<CatalogOption<TSort>>;
};

export function CatalogToolbar<TFilter extends string, TSort extends string>({
  children,
  filter,
  filterLabel,
  filterVariant = "buttons",
  filters,
  onFilterChange,
  onQueryChange,
  onSortChange,
  placeholder,
  query,
  resultCount,
  sort,
  sortLabel,
  sortOptions,
}: CatalogToolbarProps<TFilter, TSort>) {
  const segmented = filterVariant === "segmented";

  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--border-soft)] py-3">
      <div className="min-w-[min(100%,260px)] flex-[1_1_48rem]">
        <AppTextField
          className="w-full"
          placeholder={placeholder}
          prefix={<Search className="size-4 text-[var(--text-muted)]" />}
          suffix={
            <span className="shrink-0 whitespace-nowrap border-l border-[var(--border-soft)] pl-3 text-sm font-semibold text-[var(--text-secondary)]">
              {resultCount} results
            </span>
          }
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <fieldset
          aria-label={filterLabel}
          className={cx(
            segmented
              ? "inline-flex w-fit rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-1"
              : "flex w-fit gap-1",
          )}
        >
          {filters.map((option) => (
            <button
              key={option.value}
              className={getFilterClassName(segmented, filter === option.value)}
              disabled={option.disabled}
              type="button"
              onClick={() => onFilterChange(option.value)}
            >
              {option.label}
            </button>
          ))}
        </fieldset>
        <AppSelect
          aria-label={sortLabel}
          className="min-w-44"
          options={sortOptions}
          value={sort}
          onValueChange={(value) => onSortChange(value as TSort)}
        />
      </div>
    </div>
  );
}

function getFilterClassName(segmented: boolean, active: boolean) {
  if (segmented) {
    return cx(
      "cursor-pointer rounded px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed",
      active
        ? "bg-[var(--surface-secondary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]"
        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
    );
  }

  return cx(
    "cursor-pointer rounded border px-3 py-1.5 text-sm font-semibold transition disabled:cursor-not-allowed",
    active
      ? "border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-strong)]"
      : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]",
  );
}
