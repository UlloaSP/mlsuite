import { SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSearchField } from "@/shared/ui/AppSearchField";
import { AppToolbar } from "@/shared/ui/AppToolbar";

type Props = {
  query: string;
  count: { shown: number; total: number };
  /** Filters applied besides the search. */
  activeFilters: number;
  onQueryChange: (query: string) => void;
  onOpenFilters: () => void;
  onClearFilters: () => void;
  /** The table's own controls, such as the columns menu. */
  actions?: ReactNode;
};

export function InferenceCatalogToolbar({
  query,
  count,
  activeFilters,
  onQueryChange,
  onOpenFilters,
  onClearFilters,
  actions,
}: Props) {
  return (
    <AppToolbar variant="flat">
      <div className="flex flex-1 flex-wrap items-center gap-3">
        <AppSearchField
          label="Search inferences"
          value={query}
          onChange={onQueryChange}
          placeholder="Search names, inputs, outputs and feedback…"
          className="min-w-[260px] flex-1"
          count={{ ...count, filtered: count.shown !== count.total, noun: "inferences" }}
        />
        <AppButton variant="secondary" onClick={onOpenFilters}>
          <SlidersHorizontal size={16} />
          Filters
          {activeFilters > 0 ? (
            <span className="rounded-full bg-accent-subtle px-1.5 text-xs font-semibold text-accent-strong">
              {activeFilters}
            </span>
          ) : null}
        </AppButton>
        {activeFilters > 0 ? (
          <AppButton variant="ghost" onClick={onClearFilters}>
            Clear filters
          </AppButton>
        ) : null}
        {actions}
      </div>
    </AppToolbar>
  );
}
