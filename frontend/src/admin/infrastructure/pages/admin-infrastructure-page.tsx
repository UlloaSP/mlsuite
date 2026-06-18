import { useEffect, useRef, useState } from "react";
import { Navigate, useSearchParams } from "react-router";
import { AppEmptyState, AppPage, AppSurface } from "../../../app/components";
import { useUser } from "../../../user/hooks";
import { AlertsView } from "../components/AlertsView";
import { LogsView } from "../components/LogsView";
import { OverviewView } from "../components/OverviewView";
import { ServicesView } from "../components/ServicesView";
import { TerminalView } from "../components/TerminalView";
import {
  useInfrastructureOverview,
  useServiceAction,
  useServiceLogsSnapshot,
} from "../hooks/useInfrastructure";
import { appendLogLine, applyInfrastructureEvent, resolveSelectedService } from "../../../algorithms/admin/infrastructure/state";
import { isOverviewSnapshotEvent, isServiceLogEvent } from "../types";
import type { InfrastructureEvent, InfrastructureOverviewDto } from "../types";
import { openInfrastructureSocket, subscribeToServiceLogs } from "../ws/infrastructureSocket";

type InfraTab = "overview" | "services" | "logs" | "terminal" | "alerts";

const INFRA_TABS: InfraTab[] = ["overview", "services", "logs", "terminal", "alerts"];

export function AdminInfrastructurePage() {
  const { data: user } = useUser();
  const { data, isLoading } = useInfrastructureOverview();
  const action = useServiceAction();
  const [overview, setOverview] = useState<InfrastructureOverviewDto | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [streamConnected, setStreamConnected] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const socketRef = useRef<WebSocket | null>(null);
  const selectedServiceRef = useRef<string | null>(null);
  const selectedServiceLogs = useServiceLogsSnapshot(selectedService);
  const requestedTab = searchParams.get("tab");
  const activeTab = INFRA_TABS.includes(requestedTab as InfraTab)
    ? (requestedTab as InfraTab)
    : "overview";
  const setActiveTab = (tab: InfraTab) => {
    setSearchParams(tab === "overview" ? {} : { tab });
  };

  useEffect(() => {
    selectedServiceRef.current = selectedService;
  }, [selectedService]);

  useEffect(() => {
    if (!data) return;
    setOverview(data);
    setSelectedService((current) => resolveSelectedService(current, data));
  }, [data]);

  // react-doctor-disable-next-line react-doctor/no-effect-chain, react-doctor/no-derived-state -- Log snapshot is keyed by selected service and must reset only after that query resolves.
  useEffect(() => {
    if (!selectedServiceLogs.data || selectedServiceLogs.data.serviceName !== selectedService)
      return;
    // react-doctor-disable-next-line react-doctor/no-derived-state -- Live log buffer merges snapshots with websocket append events.
    setLogLines(selectedServiceLogs.data.lines);
  }, [selectedService, selectedServiceLogs.data]);

  // react-doctor-disable-next-line react-doctor/no-cascading-set-state -- WebSocket events update independent live dashboard slices from one event stream.
  useEffect(() => {
    const socket = openInfrastructureSocket({
      onOpen: () => setStreamConnected(true),
      onClose: () => setStreamConnected(false),
      onError: () => setStreamConnected(false),
      onMessage: (event: InfrastructureEvent) => {
        setOverview((current) => applyInfrastructureEvent(current, event));
        if (isOverviewSnapshotEvent(event)) {
          setSelectedService((current) => resolveSelectedService(current, event.payload));
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

  // react-doctor-disable-next-line react-doctor/no-effect-chain -- Socket subscription must follow the latest selected service and connection state.
  useEffect(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      subscribeToServiceLogs(socketRef.current, selectedService);
    }
  }, [selectedService, streamConnected]);

  if (user?.systemRole !== "SUPERADMIN") {
    return <Navigate to="/workspace" replace />;
  }

  const currentOverview = overview ?? data;
  const selectedStatus =
    currentOverview?.services.find((service) => service.name === selectedService) ?? null;

  const handleSelectService = (serviceName: string) => {
    setSelectedService(serviceName);
    setLogLines([]);
  };

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col overflow-auto app-scroll bg-[var(--page-bg)]">
        <div className="flex-1 px-6 py-5">
          {currentOverview ? (
            <>
              {activeTab === "overview" && (
                <OverviewView
                  overview={currentOverview}
                  streamConnected={streamConnected}
                  onNavigateTab={setActiveTab}
                />
              )}
              {activeTab === "services" && (
                <ServicesView
                  services={currentOverview.services}
                  selectedService={selectedService}
                  busyService={action.variables?.serviceName ?? null}
                  onSelect={(name) => {
                    handleSelectService(name);
                  }}
                  onAction={(name, a) => action.mutate({ serviceName: name, action: a })}
                />
              )}
              {activeTab === "logs" && (
                <LogsView
                  services={currentOverview.services}
                  selectedService={selectedService}
                  logLines={logLines}
                  streamConnected={streamConnected}
                  onSelectService={handleSelectService}
                />
              )}
              {activeTab === "terminal" && (
                <TerminalView
                  services={currentOverview.services}
                  selectedService={selectedService}
                  terminalEnabled={Boolean(selectedStatus?.terminalEnabled)}
                  onSelectService={handleSelectService}
                />
              )}
              {activeTab === "alerts" && (
                <AlertsView
                  overview={currentOverview}
                  streamConnected={streamConnected}
                  selectedService={selectedService}
                />
              )}
            </>
          ) : (
            <AppEmptyState
              title={isLoading ? "Loading infrastructure snapshot" : "No infrastructure snapshot"}
              description="The dashboard needs an ops-agent overview before it can render service metrics and controls."
            />
          )}
        </div>
      </AppSurface>
    </AppPage>
  );
}
