import { useDeferredValue, useEffect, useRef, type SetStateAction } from "react";
import { useSearchParams } from "react-router";

type CatalogControlsOptions<TFilter extends string, TSort extends string> = {
  initialFilter: TFilter;
  initialSort: TSort;
  filters: readonly TFilter[];
  sorts: readonly TSort[];
  normalizeQuery?: (query: string) => string;
  resetKey?: unknown;
};

export type CatalogControls<TFilter extends string, TSort extends string> = {
  filter: TFilter;
  page: number;
  query: string;
  search: string;
  setFilter: (value: TFilter) => void;
  setPage: (next: SetStateAction<number>) => void;
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
  resetKey,
}: CatalogControlsOptions<TFilter, TSort>): CatalogControls<TFilter, TSort> {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const filterParam = params.get("filter");
  const sortParam = params.get("sort");
  const filter = filters.includes(filterParam as TFilter)
    ? (filterParam as TFilter)
    : initialFilter;
  const sort = sorts.includes(sortParam as TSort) ? (sortParam as TSort) : initialSort;
  const pageParam = Number(params.get("page"));
  const urlPage = Number.isInteger(pageParam) && pageParam > 0 ? pageParam - 1 : 0;
  const resetKeyRef = useRef(resetKey);
  const resetChanged = resetKeyRef.current !== resetKey;
  const page = resetChanged ? 0 : urlPage;
  const search = useDeferredValue(normalizeQuery(query));

  useEffect(() => {
    if (!resetChanged) return;
    resetKeyRef.current = resetKey;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [resetChanged, resetKey, setParams]);

  useEffect(() => {
    if (!filterParam || filters.includes(filterParam as TFilter)) return;
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.delete("filter");
        next.delete("page");
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

  const setPage = (next: SetStateAction<number>) => {
    const value = Math.max(0, typeof next === "function" ? next(page) : next);
    update({ page: value === 0 ? null : String(value + 1) });
  };

  const setQuery = (value: string) => {
    update({ q: value || null, page: null }, true);
  };

  const setFilter = (value: TFilter) => {
    update({ filter: value === initialFilter ? null : value, page: null });
  };

  const setSort = (value: TSort) => {
    update({ sort: value === initialSort ? null : value, page: null });
  };

  return { filter, page, query, search, setFilter, setPage, setQuery, setSort, sort };
}
