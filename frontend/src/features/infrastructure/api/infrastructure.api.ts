import { appFetch, json } from "@/shared/api/http";
import type {
  InfrastructureOverviewDto,
  ServiceAction,
  ServiceLogsSnapshotDto,
} from "./infrastructure.types";
import type {
  ServiceActionRequest,
  TerminalSessionRequest,
  TerminalSessionResponse,
} from "@/shared/api/openapi.gen";

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
    json("POST", { action } satisfies ServiceActionRequest),
  );

export const createTerminalSession = (serviceName: string, cols: number, rows: number) =>
  appFetch<TerminalSessionResponse>(
    "/api/admin/infrastructure/terminal/sessions",
    json("POST", { serviceName, cols, rows } satisfies TerminalSessionRequest),
  );

export const closeTerminalSession = (sessionId: string) =>
  appFetch<void>(`/api/admin/infrastructure/terminal/sessions/${sessionId}`, {
    method: "DELETE",
  });
