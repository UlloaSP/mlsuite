import { useEffect } from "react";
import { useSearchParamsUpdate, useUrlSearchParams } from "@/shared/lib/url-search-params";
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

const trimQuery = (query: string) => query.trim();

export function useCatalogControls<TFilter extends string, TSort extends string>({
  initialFilter,
  initialSort,
  filters,
  sorts,
  normalizeQuery = trimQuery,
}: CatalogControlsOptions<TFilter, TSort>): CatalogControls<TFilter, TSort> {
  const params = useUrlSearchParams();
  const updateParams = useSearchParamsUpdate();
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
    updateParams((next) => next.delete("filter"));
  }, [filterParam, filters, updateParams]);

  const update = (values: Record<string, string | null>, replace = false) => {
    updateParams(
      (next) => {
        Object.entries(values).forEach(([key, value]) => {
          if (value) next.set(key, value);
          else next.delete(key);
        });
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
