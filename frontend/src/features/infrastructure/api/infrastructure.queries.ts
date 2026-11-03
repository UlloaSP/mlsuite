import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query";
import {
  getInfrastructureOverview,
  getServiceLogsSnapshot,
  getSystemAlerts,
} from "./infrastructure.api";
import { infrastructureKeys } from "./infrastructure.keys";
import type { InfrastructureEvent } from "./infrastructure.types";
import { applyInfrastructureEvent } from "@/features/infrastructure/lib/infrastructure-state";

export const infrastructureOverviewQueryOptions = () =>
  queryOptions({
    queryKey: infrastructureKeys.all,
    queryFn: ({ signal }) => getInfrastructureOverview(signal),
    refetchInterval: 5000,
    // Each tab says the agent is away in its own place; polling must not repeat it as a toast.
    meta: { errorHandledLocally: true },
  });

export const serviceLogsQueryOptions = (serviceName: string | null) =>
  queryOptions({
    queryKey: infrastructureKeys.logs(serviceName),
    queryFn: ({ signal }) => getServiceLogsSnapshot(serviceName ?? "", 200, signal),
    enabled: Boolean(serviceName),
    refetchInterval: 5000,
  });

/** A pushed event updates the polled overview in place, until the next poll replaces it. */
export const receiveInfrastructureEvent = (client: QueryClient, event: InfrastructureEvent) =>
  client.setQueryData(infrastructureOverviewQueryOptions().queryKey, (current) =>
    applyInfrastructureEvent(current, event),
  );

/** How often the page and the navigation ask about alerts; the API reads signals every 15 s. */
const ALERTS_POLL_MS = 15_000;

export const systemAlertsQueryOptions = () =>
  queryOptions({
    queryKey: infrastructureKeys.alerts,
    queryFn: ({ signal }) => getSystemAlerts(signal),
    refetchInterval: ALERTS_POLL_MS,
    meta: { errorHandledLocally: true },
  });

export const useInfrastructureOverview = () => useQuery(infrastructureOverviewQueryOptions());

export const useSystemAlerts = () => useQuery(systemAlertsQueryOptions());

/** Superadmins only: anyone else would be refused. */
export const useOpenSystemAlertCount = (enabled: boolean) =>
  useQuery({
    ...systemAlertsQueryOptions(),
    enabled,
    select: (alerts) => alerts.open.length,
  });

export const useServiceLogsSnapshot = (serviceName: string | null) =>
  useQuery(serviceLogsQueryOptions(serviceName));
