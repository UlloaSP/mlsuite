import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cx } from "@/shared/ui/cx";
import { buildDashboardAlerts } from "@/features/infrastructure/lib/dashboard-summary";
import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";
import { alertTone } from "@/features/infrastructure/lib/alert-tone";

type NavigateTab = (tab: "overview" | "services" | "logs" | "terminal" | "alerts") => void;

export function OverviewSignalsPanel({
  overview,
  streamConnected,
  onNavigateTab,
}: {
  overview: InfrastructureOverviewDto;
  streamConnected: boolean;
  onNavigateTab: NavigateTab;
}) {
  const alerts = buildDashboardAlerts(overview, streamConnected, null);
  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold text-fg">Operational signals</p>
          <p className="mt-0.5 text-xs text-fg-secondary">{alerts.length} active in last 60m</p>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-fg-secondary hover:text-fg"
          onClick={() => onNavigateTab("alerts")}
        >
          View all
        </button>
      </div>
      <div className="divide-y divide-line">
        {alerts.slice(0, 4).map((alert) => (
          <div key={alert.id} className="flex gap-3 px-4 py-3">
            <div
              className={cx(
                "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                alertTone(alert.tone),
              )}
            >
              {alert.tone === "success" ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-fg">{alert.title}</p>
              <p className="mt-0.5 text-2xs text-fg-secondary">{alert.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
