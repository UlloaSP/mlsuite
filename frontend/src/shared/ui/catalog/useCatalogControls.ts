import { useDebouncedValue } from "@/shared/lib/use-debounced-value";
import { useSearchUpdate } from "@/shared/lib/use-search-update";

/** A catalog's search, filter and sort as its route validated them from the URL. */
export type CatalogSearch<TFilter extends string, TSort extends string> = {
  q: string;
  filter: TFilter;
  sort: TSort;
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

/**
 * The controls of a catalog whose search, filter and sort live in the URL. Typing replaces the
 * history entry and reaches the server after a pause; a new filter or sort is a new entry.
 */
export function useCatalogControls<TFilter extends string, TSort extends string>(
  { q, filter, sort }: CatalogSearch<TFilter, TSort>,
  normalizeQuery: (query: string) => string = trimQuery,
): CatalogControls<TFilter, TSort> {
  const update = useSearchUpdate<CatalogSearch<TFilter, TSort>>();
  const search = useDebouncedValue(normalizeQuery(q));

  return {
    filter,
    query: q,
    search,
    setFilter: (value) => update({ filter: value }, { replace: false }),
    setQuery: (value) => update({ q: value }),
    setSort: (value) => update({ sort: value }, { replace: false }),
    sort,
  };
}
