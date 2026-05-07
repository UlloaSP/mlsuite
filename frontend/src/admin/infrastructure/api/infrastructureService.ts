import { appFetch } from "../../../app/api/appFetch";
import type {
	InfrastructureOverviewDto,
	ServiceLogsSnapshotDto,
	TerminalSessionDto,
} from "../types";

type ServiceAction = "START" | "STOP" | "RESTART";

export const getInfrastructureOverview = () =>
	appFetch<InfrastructureOverviewDto>("/api/admin/infrastructure/overview");

export const runServiceAction = (serviceName: string, action: ServiceAction) =>
	appFetch<void>(
		`/api/admin/infrastructure/services/${serviceName}/actions`,
		json("POST", { action }),
	);

export const getServiceLogsSnapshot = (serviceName: string, tail = 200) =>
	appFetch<ServiceLogsSnapshotDto>(
		`/api/admin/infrastructure/services/${serviceName}/logs?tail=${tail}`,
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

function json(method: string, body: unknown): RequestInit {
	return {
		method,
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	};
}
