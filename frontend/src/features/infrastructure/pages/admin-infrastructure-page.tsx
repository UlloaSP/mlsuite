import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { getRouteApi, Navigate } from "@tanstack/react-router";
import type { INFRA_TABS } from "@/features/infrastructure/pages/infrastructure-search";
import { useQueryClient } from "@tanstack/react-query";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { useUser } from "@/capabilities/workspace-context/session";
import { AlertsView } from "@/features/infrastructure/components/AlertsView";
import { LogsView } from "@/features/infrastructure/components/LogsView";
import { OverviewView } from "@/features/infrastructure/components/OverviewView";
import { ServicesView } from "@/features/infrastructure/components/ServicesView";
import {
  receiveInfrastructureEvent,
  useInfrastructureOverview,
  useServiceLogsSnapshot,
} from "@/features/infrastructure/api/infrastructure.queries";
import { useServiceAction } from "@/features/infrastructure/api/infrastructure.mutations";
import {
  appendLogLine,
  serviceActionConfirmation,
  resolveSelectedService,
} from "@/features/infrastructure/lib/infrastructure-state";
import {
  isServiceLogEvent,
  type InfrastructureEvent,
} from "@/features/infrastructure/api/infrastructure.types";
import {
  openInfrastructureSocket,
  subscribeToServiceLogs,
} from "@/features/infrastructure/lib/infrastructure-socket";
import { useActionDialog } from "@/shared/ui/use-action-dialog";

type InfraTab = (typeof INFRA_TABS)[number];

const route = getRouteApi("/protected/app/superadmin/admin/infrastructure");

// Xterm and its stylesheet load only when the Terminal tab is opened.
const TerminalView = lazy(() =>
  import("@/features/infrastructure/components/TerminalView").then((m) => ({
    default: m.TerminalView,
  })),
);

export function AdminInfrastructurePage() {
  const { data: user } = useUser();
  const queryClient = useQueryClient();
  const [streamConnected, setStreamConnected] = useState(false);
  const { data: overview, isLoading, refetch } = useInfrastructureOverview(streamConnected);
  const showLoading = useStableLoading(isLoading);
  const action = useServiceAction();
  const actionDialog = useActionDialog();
  const [requestedService, setRequestedService] = useState<string | null>(null);
  const selectedService = overview ? resolveSelectedService(requestedService, overview) : null;
  const [logLines, setLogLines] = useState<string[]>([]);
  const navigate = route.useNavigate();
  const socketRef = useRef<WebSocket | null>(null);
  const selectedServiceRef = useRef<string | null>(null);
  const selectedServiceLogs = useServiceLogsSnapshot(selectedService, streamConnected);
  const activeTab = route.useSearch({ select: (search) => search.tab });
  // A tab starts without the previous tab's filters.
  const setActiveTab = (tab: InfraTab) => void navigate({ to: ".", search: { tab } });

  useEffect(() => {
    selectedServiceRef.current = selectedService;
  }, [selectedService]);

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
        receiveInfrastructureEvent(queryClient, event);
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
  }, [queryClient]);

  // react-doctor-disable-next-line react-doctor/no-effect-chain -- Socket subscription must follow the latest selected service and connection state.
  useEffect(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      subscribeToServiceLogs(socketRef.current, selectedService);
    }
  }, [selectedService, streamConnected]);

  if (user?.systemRole !== "SUPERADMIN") {
    return <Navigate to="/workspace" replace />;
  }

  const selectedStatus =
    overview?.services.find((service) => service.name === selectedService) ?? null;

  const handleSelectService = (serviceName: string) => {
    setRequestedService(serviceName);
    setLogLines([]);
  };

  return (
    <AppPage>
      {actionDialog.dialog}
      {/* Each view renders its own page header; the loading and empty states share this one. */}
      <AppSurface className="app-scroll flex flex-1 flex-col gap-6 overflow-auto">
        {activeTab === "alerts" ? (
          // Alerts come from the API, so they stay readable while the ops agent is away.
          <AlertsView overview={overview} streamConnected={streamConnected} />
        ) : overview && !showLoading ? (
          <>
            {activeTab === "overview" && (
              <OverviewView
                overview={overview}
                streamConnected={streamConnected}
                onNavigateTab={setActiveTab}
              />
            )}
            {activeTab === "services" && (
              <ServicesView
                services={overview.services}
                selectedService={selectedService}
                busyService={action.isPending ? (action.variables?.serviceName ?? null) : null}
                onSelect={handleSelectService}
                onSync={() => void refetch()}
                onAction={(name, a) => {
                  const confirmation = serviceActionConfirmation(name, a);
                  void (async () => {
                    if (confirmation && !(await actionDialog.confirm(confirmation))) return;
                    action.mutate({ serviceName: name, action: a });
                  })();
                }}
              />
            )}
            {activeTab === "logs" && (
              <LogsView
                services={overview.services}
                selectedService={selectedService}
                logLines={logLines}
                streamConnected={streamConnected}
                onSelectService={handleSelectService}
              />
            )}
            {activeTab === "terminal" && (
              <Suspense fallback={<AppLoadingState label="Loading terminal…" />}>
                <TerminalView
                  services={overview.services}
                  selectedService={selectedService}
                  terminalEnabled={Boolean(selectedStatus?.terminalEnabled)}
                  onSelectService={handleSelectService}
                />
              </Suspense>
            )}
          </>
        ) : (
          <>
            <AppPageHeader
              breadcrumbs={[{ label: "Infrastructure" }]}
              title="Infrastructure"
              description="Managed services, live logs, shell access, and aggregate resource use."
            />
            {showLoading ? (
              <AppLoadingState label="Loading infrastructure snapshot…" />
            ) : (
              <AppEmptyState
                title="No infrastructure snapshot"
                description="The dashboard needs an ops-agent overview before it can render service metrics and controls."
              />
            )}
          </>
        )}
      </AppSurface>
    </AppPage>
  );
}
