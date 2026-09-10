import { useState } from "react";
import { AlertTriangle, CheckCircle2, TerminalSquare } from "lucide-react";
import { cx } from "@/shared/ui/cx";
import { buildDashboardAlerts } from "@/features/infrastructure/lib/dashboard-summary";
import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";
import { AlertSegmentedControl } from "./AlertSegmentedControl";

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
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Operational signals
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Alerts
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {filtered.length} active alerts across the cluster.
          </p>
        </div>
        <AlertSegmentedControl
          options={[
            { key: "all", label: `All ${counts.all}` },
            { key: "danger", label: `Critical ${counts.danger}` },
            { key: "warning", label: `Warning ${counts.warning}` },
            { key: "info", label: `Info ${counts.info}` },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as AlertLevel)}
        />
      </div>

      {/* Alert list */}
      <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] divide-y divide-[var(--border-soft)]">
        {filtered.map((alert) => (
          <div key={alert.id} className="flex items-start gap-3 px-5 py-4">
            <div
              className={cx(
                "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                alert.tone === "danger" && "bg-[var(--danger-quiet)] text-[var(--danger-text)]",
                alert.tone === "warning" && "bg-[var(--warning-quiet)] text-[var(--warning-text)]",
                alert.tone === "accent" &&
                  "bg-[var(--accent-quiet)] text-[var(--accent-primary-strong)]",
                alert.tone === "success" && "bg-[var(--success-quiet)] text-[var(--success-text)]",
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
              <p className="text-sm font-medium text-[var(--text-primary)]">{alert.title}</p>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{alert.detail}</p>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-[var(--text-muted)]">
            No alerts match this filter.
          </div>
        )}
      </div>
    </div>
  );
}
