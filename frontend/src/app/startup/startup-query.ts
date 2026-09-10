import { queryOptions, useQuery } from "@tanstack/react-query";
import { getStartupReadiness } from "./startupReadiness";

const STARTUP_QUERY_KEY = ["startup", "readiness"] as const;
const RETRY_MS = 1_500;

export const startupReadinessQueryOptions = () =>
  queryOptions({
    queryKey: STARTUP_QUERY_KEY,
    queryFn: ({ signal }) => getStartupReadiness(signal),
    retry: false,
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.ready ? false : RETRY_MS),
  });

export const useStartupReadinessQuery = () => useQuery(startupReadinessQueryOptions());
