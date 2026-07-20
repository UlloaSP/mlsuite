import { queryOptions } from "@tanstack/react-query";
import { getInfrastructureOverview, getServiceLogsSnapshot } from "./services";
import { INFRASTRUCTURE_LOGS_QUERY_KEY, INFRASTRUCTURE_QUERY_KEY } from "./hooks/query-keys";

export const infrastructureOverviewQueryOptions = () =>
  queryOptions({
    queryKey: INFRASTRUCTURE_QUERY_KEY,
    queryFn: ({ signal }) => getInfrastructureOverview(signal),
    refetchInterval: 5000,
  });

export const serviceLogsQueryOptions = (serviceName: string | null) =>
  queryOptions({
    queryKey: INFRASTRUCTURE_LOGS_QUERY_KEY(serviceName),
    queryFn: ({ signal }) => getServiceLogsSnapshot(serviceName ?? "", 200, signal),
    enabled: Boolean(serviceName),
    refetchInterval: 5000,
  });
