import { queryOptions, useQuery } from "@tanstack/react-query";
import { getInfrastructureOverview, getServiceLogsSnapshot } from "./infrastructure.api";
import { infrastructureKeys } from "./infrastructure.keys";

export const infrastructureOverviewQueryOptions = () =>
  queryOptions({
    queryKey: infrastructureKeys.all,
    queryFn: ({ signal }) => getInfrastructureOverview(signal),
    refetchInterval: 5000,
  });

export const serviceLogsQueryOptions = (serviceName: string | null) =>
  queryOptions({
    queryKey: infrastructureKeys.logs(serviceName),
    queryFn: ({ signal }) => getServiceLogsSnapshot(serviceName ?? "", 200, signal),
    enabled: Boolean(serviceName),
    refetchInterval: 5000,
  });

export const useInfrastructureOverview = () => useQuery(infrastructureOverviewQueryOptions());

export const useServiceLogsSnapshot = (serviceName: string | null) =>
  useQuery(serviceLogsQueryOptions(serviceName));
