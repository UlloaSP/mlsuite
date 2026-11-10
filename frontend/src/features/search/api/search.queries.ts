import { queryOptions } from "@tanstack/react-query";
import { searchWorkspace } from "./search.api";
import { searchKeys } from "./search.keys";

export const searchQueryOptions = (organizationId: number | string | undefined, query: string) => {
  const organization = organizationId ?? "none";
  return queryOptions({
    queryKey: searchKeys.results(organization, query),
    queryFn: ({ signal }) => searchWorkspace(query, signal),
    enabled: Boolean(organizationId) && query.trim().length >= 2,
    staleTime: 30_000,
    // A new query keeps this organization's previous results on screen until its own arrive.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === organization ? previous : undefined,
  });
};
