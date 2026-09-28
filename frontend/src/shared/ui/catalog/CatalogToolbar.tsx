/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReactNode } from "react";
import { Search } from "lucide-react";

import { AppSegmentedControl } from "@/shared/ui/AppSegmentedControl";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppToolbar } from "@/shared/ui/AppToolbar";
import { CONTROL_HEIGHT } from "@/shared/ui/control-size";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";

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
    <AppToolbar variant="flat">
      <div className="min-w-[min(100%,260px)] flex-[1_1_48rem]">
        <AppTextField
          className="w-full"
          placeholder={placeholder}
          prefix={<Search className="size-4 text-fg-muted" />}
          suffix={
            <span className="shrink-0 whitespace-nowrap border-l border-line pl-3 text-sm font-semibold text-fg-secondary">
              {resultCount} {resultCount === 1 ? "result" : "results"}
            </span>
          }
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </div>
      {children}
      <div className="flex flex-wrap items-center gap-3">
        {filters.length > 1 && segmented ? (
          <AppSegmentedControl
            label={filterLabel}
            options={filters}
            size="md"
            value={filter}
            onChange={onFilterChange}
          />
        ) : null}
        {filters.length > 1 && !segmented ? (
          <fieldset aria-label={filterLabel} className="flex w-fit gap-1">
            {filters.map((option) => (
              <button
                key={option.value}
                aria-pressed={filter === option.value}
                className={filterChipClass(filter === option.value)}
                disabled={option.disabled}
                type="button"
                onClick={() => onFilterChange(option.value)}
              >
                {option.label}
              </button>
            ))}
          </fieldset>
        ) : null}
        <AppSelect
          aria-label={sortLabel}
          className="min-w-44"
          options={sortOptions}
          value={sort}
          onValueChange={(value) => onSortChange(value as TSort)}
        />
      </div>
    </AppToolbar>
  );
}

function filterChipClass(active: boolean) {
  return cx(
    "cursor-pointer rounded-control border px-3 text-sm font-semibold transition disabled:cursor-not-allowed",
    CONTROL_HEIGHT.md,
    FOCUS_RING,
    active
      ? "border-accent bg-accent-subtle text-accent-strong"
      : "border-line text-fg-secondary hover:border-line-strong hover:text-fg",
  );
}
