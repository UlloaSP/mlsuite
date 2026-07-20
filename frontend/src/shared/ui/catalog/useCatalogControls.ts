import { useDeferredValue, useState, type SetStateAction } from "react";

type CatalogControlsOptions<TFilter extends string, TSort extends string> = {
  initialFilter: TFilter;
  initialSort: TSort;
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
  normalizeQuery = (query) => query.trim(),
  resetKey,
}: CatalogControlsOptions<TFilter, TSort>): CatalogControls<TFilter, TSort> {
  const [query, setQueryValue] = useState("");
  const [filter, setFilterValue] = useState<TFilter>(initialFilter);
  const [sort, setSortValue] = useState<TSort>(initialSort);
  const [pageState, setPageState] = useState({ page: 0, resetKey });
  const search = useDeferredValue(normalizeQuery(query));
  const page = pageState.resetKey === resetKey ? pageState.page : 0;

  const setPage = (next: SetStateAction<number>) => {
    setPageState((current) => {
      const currentPage = current.resetKey === resetKey ? current.page : 0;
      return {
        page: Math.max(0, typeof next === "function" ? next(currentPage) : next),
        resetKey,
      };
    });
  };

  const setQuery = (value: string) => {
    setPage(0);
    setQueryValue(value);
  };

  const setFilter = (value: TFilter) => {
    setPage(0);
    setFilterValue(value);
  };

  const setSort = (value: TSort) => {
    setPage(0);
    setSortValue(value);
  };

  return { filter, page, query, search, setFilter, setPage, setQuery, setSort, sort };
}
