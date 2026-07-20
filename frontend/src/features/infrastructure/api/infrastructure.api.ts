import { appFetch, json } from "@/shared/api/http";
import type {
  InfrastructureOverviewDto,
  ServiceAction,
  ServiceLogsSnapshotDto,
  TerminalSessionDto,
} from "./infrastructure.types";

export const getInfrastructureOverview = (signal?: AbortSignal) =>
  appFetch<InfrastructureOverviewDto>("/api/admin/infrastructure/overview", { signal });

export const getServiceLogsSnapshot = (serviceName: string, tail = 200, signal?: AbortSignal) =>
  appFetch<ServiceLogsSnapshotDto>(
    `/api/admin/infrastructure/services/${serviceName}/logs?tail=${tail}`,
    { signal },
  );

export const runServiceAction = (serviceName: string, action: ServiceAction) =>
  appFetch<void>(
    `/api/admin/infrastructure/services/${serviceName}/actions`,
    json("POST", { action }),
  );

export const createTerminalSession = (serviceName: string, cols: number, rows: number) =>
  appFetch<TerminalSessionDto>(
    "/api/admin/infrastructure/terminal/sessions",
    json("POST", { serviceName, cols, rows }),
  );

export const closeTerminalSession = (sessionId: string) =>
  appFetch<void>(`/api/admin/infrastructure/terminal/sessions/${sessionId}`, {
    method: "DELETE",
  });
