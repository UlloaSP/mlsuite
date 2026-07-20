import { queryOptions } from "@tanstack/react-query";
import { searchWorkspace } from "./search.api";
import { searchKeys } from "./search.keys";

export const searchQueryOptions = (organizationId: number | string | undefined, query: string) =>
  queryOptions({
    queryKey: searchKeys.results(organizationId ?? "none", query),
    queryFn: ({ signal }) => searchWorkspace(query, signal),
    enabled: Boolean(organizationId) && query.trim().length >= 2,
    staleTime: 30_000,
  });
