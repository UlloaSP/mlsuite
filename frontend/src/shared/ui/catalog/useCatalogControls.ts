import { useSearchText } from "@/shared/lib/use-search-text";
import { useSearchUpdate } from "@/shared/lib/use-search-update";

/** A catalog's search, filter and sort as its route validated them from the URL. */
export type CatalogSearch<TFilter extends string, TSort extends string> = {
  q: string;
  filter: TFilter;
  sort: TSort;
};

export type CatalogControls<TFilter extends string, TSort extends string> = {
  filter: TFilter;
  /** What the search box shows while typing. */
  query: string;
  /** What the server is asked for: the URL's settled search. */
  search: string;
  setFilter: (value: TFilter) => void;
  setQuery: (value: string) => void;
  setSort: (value: TSort) => void;
  sort: TSort;
};

const trimQuery = (query: string) => query.trim();

/**
 * The controls of a catalog whose search, filter and sort live in the URL. Typing reaches the
 * URL, and so the server, after a pause and replaces the history entry; a new filter or sort is
 * a new entry.
 */
export function useCatalogControls<TFilter extends string, TSort extends string>(
  { q, filter, sort }: CatalogSearch<TFilter, TSort>,
  normalizeQuery: (query: string) => string = trimQuery,
): CatalogControls<TFilter, TSort> {
  const update = useSearchUpdate<CatalogSearch<TFilter, TSort>>();
  const box = useSearchText(q, (value) => update({ q: value }));

  return {
    filter,
    query: box.text,
    search: normalizeQuery(q),
    setFilter: (value) => update({ filter: value }, { replace: false }),
    setQuery: box.setText,
    setSort: (value) => update({ sort: value }, { replace: false }),
    sort,
  };
}
