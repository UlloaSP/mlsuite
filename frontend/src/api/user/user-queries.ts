import { queryOptions } from "@tanstack/react-query";
import { getProfile } from "./services";
import { USER_QUERY_KEY } from "./hooks/query-keys";

export const userQueryOptions = () =>
  queryOptions({
    queryKey: USER_QUERY_KEY,
    queryFn: ({ signal }) => getProfile(signal),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
