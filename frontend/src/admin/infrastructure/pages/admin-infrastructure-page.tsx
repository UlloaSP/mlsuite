import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router";
import { AppEmptyState, AppPage, AppSurface, AppTabs } from "../../../app/components";
import { useUser } from "../../../user/hooks";
import {
	getOverviewTimestamp,
} from "../dashboardSummary";
import { InfrastructureAlertRail } from "../components/InfrastructureAlertRail";
import { InfrastructureSummaryGrid } from "../components/InfrastructureSummaryGrid";
import { InfrastructureTopBar } from "../components/InfrastructureTopBar";
import { ServiceFocusBar } from "../components/ServiceFocusBar";
import { ServiceLogsPanel } from "../components/ServiceLogsPanel";
import { ServiceStatusTable } from "../components/ServiceStatusTable";
import { ServiceTerminalPanel } from "../components/ServiceTerminalPanel";
import { SystemHealthChartPanel } from "../components/SystemHealthChartPanel";
import {
	useInfrastructureOverview,
	useServiceAction,
	useServiceLogsSnapshot,
} from "../hooks/useInfrastructure";
import {
	appendLogLine,
	applyInfrastructureEvent,
	resolveSelectedService,
} from "../state";
import { isOverviewSnapshotEvent, isServiceLogEvent } from "../types";
import type { InfrastructureEvent, InfrastructureOverviewDto } from "../types";
import {
	openInfrastructureSocket,
	subscribeToServiceLogs,
} from "../ws/infrastructureSocket";

export function AdminInfrastructurePage() {
	const { data: user } = useUser();
	const { data, isLoading } = useInfrastructureOverview();
	const action = useServiceAction();
	const [overview, setOverview] = useState<InfrastructureOverviewDto | null>(null);
	const [selectedService, setSelectedService] = useState<string | null>(null);
	const [logLines, setLogLines] = useState<string[]>([]);
	const [streamConnected, setStreamConnected] = useState(false);
	const [workspaceView, setWorkspaceView] = useState<"logs" | "terminal">("logs");
	const socketRef = useRef<WebSocket | null>(null);
	const selectedServiceRef = useRef<string | null>(null);
	const selectedServiceLogs = useServiceLogsSnapshot(selectedService);

	useEffect(() => {
		selectedServiceRef.current = selectedService;
	}, [selectedService]);

	useEffect(() => {
		if (!data) {
			return;
		}
		setOverview(data);
		setSelectedService((current) => resolveSelectedService(current, data));
	}, [data]);

	useEffect(() => {
		if (!selectedServiceLogs.data || selectedServiceLogs.data.serviceName !== selectedService) {
			return;
		}
		setLogLines(selectedServiceLogs.data.lines);
	}, [selectedService, selectedServiceLogs.data]);

	useEffect(() => {
		const socket = openInfrastructureSocket({
			onOpen: () => setStreamConnected(true),
			onClose: () => setStreamConnected(false),
			onError: () => setStreamConnected(false),
			onMessage: (event: InfrastructureEvent) => {
				setOverview((current) => applyInfrastructureEvent(current, event));
				if (isOverviewSnapshotEvent(event)) {
					setSelectedService((current) =>
						resolveSelectedService(current, event.payload),
					);
				}
				if (isServiceLogEvent(event)) {
					setLogLines((current) => appendLogLine(current, event, selectedServiceRef.current));
				}
			},
		});
		socketRef.current = socket;
		return () => {
			socket.close();
			socketRef.current = null;
		};
	}, []);

	useEffect(() => {
		if (socketRef.current?.readyState === WebSocket.OPEN) {
			subscribeToServiceLogs(socketRef.current, selectedService);
		}
	}, [selectedService, streamConnected]);

	if (user?.systemRole !== "SUPERADMIN") {
		return <Navigate to="/workspace" replace />;
	}

	const currentOverview = overview ?? data;
	const selectedStatus = currentOverview?.services.find((service) => service.name === selectedService) ?? null;

	return (
		<AppPage>
			<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto app-scroll bg-[radial-gradient(circle_at_top_left,_rgba(255,56,92,0.08),_transparent_22%),linear-gradient(180deg,_#f8f5f2_0%,_#f4f6f9_42%,_#f7f4f1_100%)]">
				<InfrastructureTopBar
					streamConnected={streamConnected}
					lastUpdated={currentOverview ? getOverviewTimestamp(currentOverview) : null}
					selectedService={selectedService}
				/>
				{currentOverview ? (
					<>
						<InfrastructureSummaryGrid overview={currentOverview} />
						<div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
							<SystemHealthChartPanel overview={currentOverview} streamConnected={streamConnected} />
							<InfrastructureAlertRail
								overview={currentOverview}
								streamConnected={streamConnected}
								selectedService={selectedService}
							/>
						</div>
						<ServiceStatusTable
							services={currentOverview.services}
							selectedService={selectedService}
							busyService={action.variables?.serviceName ?? null}
							onSelect={(serviceName) => {
								setSelectedService(serviceName);
								setLogLines([]);
								setWorkspaceView("logs");
							}}
							onAction={(serviceName, nextAction) => action.mutate({ serviceName, action: nextAction })}
						/>
						<div className="min-h-0 space-y-4">
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">
										workspace
									</p>
									<p className="mt-1 text-sm text-[var(--text-secondary)]">
										{selectedService ? `Focused on ${selectedService}` : "Select a service to inspect logs and shell."}
									</p>
								</div>
								<AppTabs
									className="xl:hidden"
									items={[
										{ label: "Logs", value: "logs" },
										{ label: "Terminal", value: "terminal" },
									]}
									value={workspaceView}
									onChange={setWorkspaceView}
								/>
							</div>
							<ServiceFocusBar
								services={currentOverview.services}
								selectedService={selectedService}
								onSelect={(serviceName) => {
									setSelectedService(serviceName);
									setLogLines([]);
									setWorkspaceView("logs");
								}}
							/>
							<div className="hidden min-h-0 gap-6 xl:grid xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
								<ServiceLogsPanel
									serviceName={selectedService}
									lines={logLines}
									streamConnected={streamConnected}
								/>
								<ServiceTerminalPanel
									serviceName={selectedService}
									enabled={Boolean(selectedStatus?.terminalEnabled)}
								/>
							</div>
							<div className="xl:hidden">
								{workspaceView === "logs" ? (
									<ServiceLogsPanel
										serviceName={selectedService}
										lines={logLines}
										streamConnected={streamConnected}
									/>
								) : (
									<ServiceTerminalPanel
										serviceName={selectedService}
										enabled={Boolean(selectedStatus?.terminalEnabled)}
									/>
								)}
							</div>
						</div>
					</>
				) : (
					<AppEmptyState
						title={isLoading ? "Loading infrastructure snapshot" : "No infrastructure snapshot"}
						description="The dashboard needs an ops-agent overview before it can render host metrics and service controls."
					/>
				)}
			</AppSurface>
		</AppPage>
	);
}
