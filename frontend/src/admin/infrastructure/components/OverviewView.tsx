import { useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import { AppButton } from "../../../app/components";
import { countHealthyServices, countProblemServices, toneForMetric } from "../../../algorithms/admin/infrastructure/dashboard-summary";
import { formatBytes, formatPercent } from "../../../algorithms/admin/infrastructure/formatters";
import type { InfrastructureOverviewDto } from "../types";
import { KpiCard, SegmentedControl } from "./OverviewViewSupport";
import { OverviewChartPanel } from "./OverviewChartPanel";
import { OverviewServicePanels, OverviewSignalsPanel } from "./OverviewSidePanels";

type Props = {
  overview: InfrastructureOverviewDto;
  streamConnected: boolean;
  onNavigateTab: (tab: "overview" | "services" | "logs" | "terminal" | "alerts") => void;
};

export function OverviewView({ overview, streamConnected, onNavigateTab }: Props) {
  const [chartRange, setChartRange] = useState("60m");
  const aggregate = overview.aggregate;
  const points = overview.history.points;
  const running = countHealthyServices(overview.services);
  const issues = countProblemServices(overview.services);
  const totalMem = overview.services.reduce((sum, service) => sum + (service.memoryBytes ?? 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Infrastructure overview
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Control dashboard
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Managed services, live logs, shell access, and aggregate resource use.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            options={["15m", "60m", "6h", "24h"]}
            value={chartRange}
            onChange={setChartRange}
          />
          <AppButton variant="secondary" className="gap-2 px-3 py-2 text-xs">
            <RefreshCw size={13} /> Refresh
          </AppButton>
          <AppButton className="gap-2 px-3 py-2 text-xs">
            <Download size={13} /> Export
          </AppButton>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          label="CPU"
          value={formatPercent(aggregate.cpu.percent)}
          sub="summed service CPU"
          tone={toneForMetric(aggregate.cpu.percent)}
          data={points.map((point) => ({ v: point.cpuPercent }))}
          color="#6366f1"
        />
        <KpiCard
          label="RAM"
          value={formatPercent(aggregate.ram.percent)}
          sub="service memory share"
          tone={toneForMetric(aggregate.ram.percent)}
          data={points.map((point) => ({ v: point.ramPercent }))}
          color="#10b981"
        />
        <KpiCard
          label="Disk R/W"
          value={`${formatBytes(aggregate.diskRead.bytes)} / ${formatBytes(aggregate.diskWrite.bytes)}`}
          sub="Docker BlockIO"
          tone="neutral"
          data={points.map((point) => ({ v: point.diskReadBytes }))}
          color="#f59e0b"
        />
        <KpiCard
          label="Network I/O"
          value={`${formatBytes(aggregate.networkRx.bytes)} / ${formatBytes(aggregate.networkTx.bytes)}`}
          sub="Docker NetIO"
          tone="neutral"
          data={points.map((point) => ({ v: point.networkRxBytes }))}
          color="#0ea5e9"
        />
        <KpiCard
          label="Services"
          value={`${running}/${overview.services.length}`}
          sub={issues > 0 ? `${issues} need attention` : "all healthy"}
          tone={issues > 0 ? "warning" : "success"}
          data={[]}
          color="#10b981"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <OverviewChartPanel
          overview={overview}
          streamConnected={streamConnected}
          chartRange={chartRange}
        />
        <OverviewSignalsPanel
          overview={overview}
          streamConnected={streamConnected}
          onNavigateTab={onNavigateTab}
        />
      </div>

      <OverviewServicePanels
        overview={overview}
        running={running}
        issues={issues}
        totalMem={totalMem}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}
