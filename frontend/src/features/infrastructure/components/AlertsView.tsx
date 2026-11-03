import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { buildDashboardAlerts } from "@/features/infrastructure/lib/dashboard-summary";
import { useSystemAlerts } from "@/features/infrastructure/api/infrastructure.queries";
import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";
import { AlertSection } from "./AlertSection";
import { AlertSignalsTable } from "./AlertSignalsTable";
import { LiveStateRow } from "./LiveStateRow";
import { SystemAlertRow } from "./SystemAlertRow";

type Props = {
  /** Absent while the ops agent cannot be reached; alerts do not depend on it. */
  overview: InfrastructureOverviewDto | undefined;
  streamConnected: boolean;
};

const openCount = (count: number) =>
  count === 1 ? "1 alert open on the platform." : `${count} alerts open on the platform.`;

export function AlertsView({ overview, streamConnected }: Props) {
  const alerts = useSystemAlerts();
  const liveStates = overview ? buildDashboardAlerts(overview, streamConnected) : [];

  return (
    <>
      <AppPageHeader
        breadcrumbs={[
          { label: "Infrastructure", to: "/admin/infrastructure" },
          { label: "Alerts" },
        ]}
        title="Alerts"
        description={
          alerts.data
            ? openCount(alerts.data.open.length)
            : "What the platform warned about its own load."
        }
      />

      {alerts.isError ? (
        <div className="flex items-center gap-3">
          <AppInlineAlert className="min-w-0 flex-1">
            {alerts.data
              ? `Showing the last alerts read: ${alerts.error.message}`
              : `Alerts could not be read: ${alerts.error.message}`}
          </AppInlineAlert>
          <AppButton variant="secondary" onClick={() => void alerts.refetch()}>
            Retry
          </AppButton>
        </div>
      ) : null}

      {alerts.isPending ? <AppLoadingState label="Loading alerts…" /> : null}

      {alerts.data ? (
        <>
          {alerts.data.opsAgentReporting === false ? (
            <AppInlineAlert>
              The ops agent is not reporting. CPU, memory and disk are unknown, and alerts on them
              neither raise nor clear until it is back.
            </AppInlineAlert>
          ) : null}

          <AlertSection title="Open">
            {alerts.data.open.length > 0 ? (
              alerts.data.open.map((alert) => <SystemAlertRow key={alert.id} alert={alert} />)
            ) : (
              <AppEmptyState
                compact
                title="No open alerts"
                description={
                  alerts.data.opsAgentReporting === false
                    ? "Nothing that can be measured has stayed over its thresholds."
                    : "Nothing has stayed over its thresholds."
                }
              />
            )}
          </AlertSection>

          <AlertSection
            title="Signals"
            description={
              alerts.data.sampledAt ? (
                <>
                  Read <LiveRelativeTime value={alerts.data.sampledAt} /> by this API instance.
                </>
              ) : (
                "Not read yet."
              )
            }
          >
            <AlertSignalsTable signals={alerts.data.signals} />
          </AlertSection>

          {alerts.data.recent.length > 0 ? (
            <AlertSection title="Recently resolved">
              {alerts.data.recent.map((alert) => (
                <SystemAlertRow key={alert.id} alert={alert} />
              ))}
            </AlertSection>
          ) : null}
        </>
      ) : null}

      {liveStates.length > 0 ? (
        <AlertSection
          title="Live service state"
          description="As this page sees it now. Not recorded and not notified."
        >
          {liveStates.map((state) => (
            <LiveStateRow key={state.id} state={state} />
          ))}
        </AlertSection>
      ) : null}
    </>
  );
}
