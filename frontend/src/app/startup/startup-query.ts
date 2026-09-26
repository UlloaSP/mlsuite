import { queryOptions, useQuery } from "@tanstack/react-query";
import { getStartupReadiness } from "./startupReadiness";
import { getStartupServices } from "./startupServices";

const STARTUP_QUERY_KEY = ["startup", "readiness"] as const;
const STARTUP_SERVICES_QUERY_KEY = ["startup", "services"] as const;
const RETRY_MS = 1_500;
const SERVICES_POLL_MS = 1_000;

export const startupReadinessQueryOptions = () =>
  queryOptions({
    queryKey: STARTUP_QUERY_KEY,
    queryFn: ({ signal }) => getStartupReadiness(signal),
    retry: false,
    staleTime: 0,
    refetchInterval: (query) => (query.state.data?.ready ? false : RETRY_MS),
  });

export const useStartupReadinessQuery = () => useQuery(startupReadinessQueryOptions());

export const useStartupServicesQuery = (enabled: boolean) =>
  useQuery({
    queryKey: STARTUP_SERVICES_QUERY_KEY,
    queryFn: ({ signal }) => getStartupServices(signal),
    enabled,
    retry: false,
    staleTime: 0,
    refetchInterval: enabled ? SERVICES_POLL_MS : false,
  });
