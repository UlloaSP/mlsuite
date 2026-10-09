import {
  hashKey,
  infiniteQueryOptions,
  useInfiniteQuery,
  type QueryKey,
} from "@tanstack/react-query";

export type CatalogPage<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  hasNext: boolean;
};

type CatalogOptions<TPage extends CatalogPage<unknown>> = {
  /** Resource root, the literal "infinite", then the search, filter and sort values. */
  queryKey: QueryKey;
  queryFn: (page: number, signal: AbortSignal) => Promise<TPage>;
  /** Identity used to drop a row the server shifted into a later page; defaults to `id`. */
  itemId?: (item: NoInfer<TPage>["items"][number]) => unknown;
  retry?: boolean;
  enabled?: boolean;
  staleTime?: number;
  refetchInterval?: number;
  meta?: Record<string, unknown>;
};

const defaultItemId = (item: unknown) =>
  item && typeof item === "object" && "id" in item ? item.id : undefined;

const catalogRoot = (queryKey: QueryKey) =>
  hashKey(queryKey.slice(0, queryKey.indexOf("infinite") + 1));

export function infiniteCatalogOptions<TPage extends CatalogPage<unknown>>({
  queryFn,
  itemId = defaultItemId,
  ...options
}: CatalogOptions<TPage>) {
  const root = catalogRoot(options.queryKey);
  return infiniteQueryOptions({
    ...options,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => queryFn(pageParam, signal),
    getNextPageParam: (lastPage) => (lastPage.hasNext ? lastPage.page + 1 : undefined),
    // New search, filter or sort values keep the previous rows of the same catalog on screen;
    // another resource or tenant never lends its rows.
    placeholderData: (previous, previousQuery) =>
      previousQuery && catalogRoot(previousQuery.queryKey) === root ? previous : undefined,
    select: (data) => {
      // Offset pages overlap when rows are created between two fetches.
      const seen = new Set<unknown>();
      const items = data.pages
        .flatMap((page) => page.items)
        .filter((item) => {
          const id = itemId(item);
          if (id === undefined) return true;
          if (seen.has(id)) return false;
          seen.add(id);
          return true;
        });
      return { ...data.pages.at(-1)!, items: items as TPage["items"] };
    },
  });
}

export function useInfiniteCatalog<TPage extends CatalogPage<unknown>>(
  options: CatalogOptions<TPage>,
) {
  return useInfiniteQuery(infiniteCatalogOptions(options));
}
