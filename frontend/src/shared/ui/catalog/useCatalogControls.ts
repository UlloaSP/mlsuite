import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useDebouncedValue } from "@/shared/lib/use-debounced-value";

type CatalogControlsOptions<TFilter extends string, TSort extends string> = {
  initialFilter: TFilter;
  initialSort: TSort;
  filters: readonly TFilter[];
  sorts: readonly TSort[];
  normalizeQuery?: (query: string) => string;
};

export type CatalogControls<TFilter extends string, TSort extends string> = {
  filter: TFilter;
  query: string;
  search: string;
  setFilter: (value: TFilter) => void;
  setQuery: (value: string) => void;
  setSort: (value: TSort) => void;
  sort: TSort;
};

export function useCatalogControls<TFilter extends string, TSort extends string>({
  initialFilter,
  initialSort,
  filters,
  sorts,
  normalizeQuery = (query) => query.trim(),
}: CatalogControlsOptions<TFilter, TSort>): CatalogControls<TFilter, TSort> {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const filterParam = params.get("filter");
  const sortParam = params.get("sort");
  const filter = filters.includes(filterParam as TFilter)
    ? (filterParam as TFilter)
    : initialFilter;
  const sort = sorts.includes(sortParam as TSort) ? (sortParam as TSort) : initialSort;
  const search = useDebouncedValue(normalizeQuery(query));

  useEffect(() => {
    if (!filterParam || filters.includes(filterParam as TFilter)) return;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("filter");
        return next;
      },
      { replace: true },
    );
  }, [filterParam, filters, setParams]);

  const update = (values: Record<string, string | null>, replace = false) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        Object.entries(values).forEach(([key, value]) => {
          if (value) next.set(key, value);
          else next.delete(key);
        });
        return next;
      },
      { replace },
    );
  };

  const setQuery = (value: string) => {
    update({ q: value || null }, true);
  };

  const setFilter = (value: TFilter) => {
    update({ filter: value === initialFilter ? null : value });
  };

  const setSort = (value: TSort) => {
    update({ sort: value === initialSort ? null : value });
  };

  return { filter, query, search, setFilter, setQuery, setSort, sort };
}
