import { queryOptions } from "@tanstack/react-query";
import { searchWorkspace } from "./services";
import { SEARCH_QUERY_KEY } from "./hooks/query-keys";

export const searchQueryOptions = (organizationId: number | string | undefined, query: string) =>
  queryOptions({
    queryKey: SEARCH_QUERY_KEY(organizationId ?? "none", query),
    queryFn: ({ signal }) => searchWorkspace(query, signal),
    enabled: Boolean(organizationId) && query.trim().length >= 2,
    staleTime: 30_000,
  });
