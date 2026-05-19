import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTerminalSession,
  getInfrastructureOverview,
  getServiceLogsSnapshot,
  runServiceAction,
} from "../api/infrastructureService";

const INFRASTRUCTURE_QUERY_KEY = ["adminInfrastructure"];

export function useInfrastructureOverview() {
  return useQuery({
    queryKey: INFRASTRUCTURE_QUERY_KEY,
    queryFn: getInfrastructureOverview,
    refetchInterval: 5000,
  });
}

export function useServiceLogsSnapshot(serviceName: string | null) {
  return useQuery({
    queryKey: ["adminInfrastructureLogs", serviceName],
    queryFn: () => getServiceLogsSnapshot(serviceName ?? ""),
    enabled: Boolean(serviceName),
    refetchInterval: 5000,
  });
}

export function useServiceAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serviceName,
      action,
    }: {
      serviceName: string;
      action: "START" | "STOP" | "RESTART";
    }) => runServiceAction(serviceName, action),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: INFRASTRUCTURE_QUERY_KEY,
      }),
  });
}

export function useTerminalSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      serviceName,
      cols,
      rows,
    }: {
      serviceName: string;
      cols: number;
      rows: number;
    }) => createTerminalSession(serviceName, cols, rows),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: INFRASTRUCTURE_QUERY_KEY,
      }),
  });
}
