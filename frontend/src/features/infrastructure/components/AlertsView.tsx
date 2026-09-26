import { useState } from "react";
import { AlertTriangle, CheckCircle2, TerminalSquare } from "lucide-react";
import { cx } from "@/shared/ui/cx";
import { buildDashboardAlerts } from "@/features/infrastructure/lib/dashboard-summary";
import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";
import { AppSegmentedControl } from "@/shared/ui/AppSegmentedControl";

type Props = {
  overview: InfrastructureOverviewDto;
  streamConnected: boolean;
  selectedService: string | null;
};

type AlertLevel = "all" | "danger" | "warning" | "info";

const ALERT_LEVELS: Record<string, AlertLevel> = {
  danger: "danger",
  warning: "warning",
  accent: "info",
  success: "info",
};

export function AlertsView({ overview, streamConnected, selectedService }: Props) {
  const [filter, setFilter] = useState<AlertLevel>("all");
  const alerts = buildDashboardAlerts(overview, streamConnected, selectedService);

  const filtered = alerts.filter((a) => filter === "all" || ALERT_LEVELS[a.tone] === filter);

  const counts = {
    all: alerts.length,
    danger: alerts.filter((a) => a.tone === "danger").length,
    warning: alerts.filter((a) => a.tone === "warning").length,
    info: alerts.filter((a) => a.tone === "accent" || a.tone === "success").length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-3xs font-semibold uppercase tracking-[0.14em] text-fg-secondary">
            Operational signals
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-fg">Alerts</h1>
          <p className="mt-1 text-sm text-fg-secondary">
            {filtered.length} active alerts across the cluster.
          </p>
        </div>
        <AppSegmentedControl
          label="Alert level"
          options={[
            { value: "all", label: `All ${counts.all}` },
            { value: "danger", label: `Critical ${counts.danger}` },
            { value: "warning", label: `Warning ${counts.warning}` },
            { value: "info", label: `Info ${counts.info}` },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </div>

      {/* Alert list */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface divide-y divide-line">
        {filtered.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 px-5 py-4">
            <div
              className={cx(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                alert.tone === "danger" && "bg-danger-subtle text-danger-fg",
                alert.tone === "warning" && "bg-warning-subtle text-warning-fg",
                alert.tone === "accent" && "bg-accent-subtle text-accent-strong",
                alert.tone === "success" && "bg-success-subtle text-success-fg",
              )}
            >
              {alert.tone === "success" ? (
                <CheckCircle2 size={15} />
              ) : alert.tone === "accent" ? (
                <TerminalSquare size={15} />
              ) : (
                <AlertTriangle size={15} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-fg">{alert.title}</p>
              <p className="mt-0.5 text-xs text-fg-secondary">{alert.detail}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-fg-muted">
            No alerts match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
