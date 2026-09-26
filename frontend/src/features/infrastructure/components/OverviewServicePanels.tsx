import { serviceHealthCategory } from "@/features/infrastructure/lib/status";
import { ChevronRight } from "lucide-react";
import { countHealthyServices } from "@/features/infrastructure/lib/dashboard-summary";
import { formatBytes } from "@/features/infrastructure/lib/formatters";
import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";
import { CountCell } from "./CountCell";
import { MemoryBar } from "./MemoryBar";
import { ServiceHealthSegment } from "./ServiceHealthSegment";

type NavigateTab = (tab: "overview" | "services" | "logs" | "terminal" | "alerts") => void;

export function OverviewServicePanels({
  overview,
  running,
  issues,
  totalMem,
  onNavigateTab,
}: {
  overview: InfrastructureOverviewDto;
  running: number;
  issues: number;
  totalMem: number;
  onNavigateTab: NavigateTab;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-fg">Services at a glance</p>
            <p className="mt-0.5 text-xs text-fg-secondary">
              {running} running &middot; {issues} need attention
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-fg-secondary hover:text-fg"
            onClick={() => onNavigateTab("services")}
          >
            Manage <ChevronRight size={12} />
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-surface-muted">
            {overview.services.map((service) => (
              <ServiceHealthSegment key={service.name} service={service} />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-line bg-line">
            <CountCell
              label="Healthy"
              value={countHealthyServices(overview.services)}
              color="var(--color-success-fg)"
            />
            <CountCell
              label="Degraded"
              value={
                overview.services.filter((service) => serviceHealthCategory(service) === "degraded")
                  .length
              }
              color="var(--color-warning-fg)"
            />
            <CountCell
              label="Unknown"
              value={
                overview.services.filter((service) => serviceHealthCategory(service) === "unknown")
                  .length
              }
              color="var(--color-fg-muted)"
            />
            <CountCell
              label="Down"
              value={
                overview.services.filter((service) => serviceHealthCategory(service) === "down")
                  .length
              }
              color="var(--color-danger-fg)"
            />
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="border-b border-line px-5 py-3.5">
          <p className="text-sm font-semibold text-fg">Memory usage by service</p>
          <p className="mt-0.5 text-xs text-fg-secondary">{formatBytes(totalMem)} allocated</p>
        </div>
        <div className="px-5 py-3">
          {overview.services
            .filter((service) => service.memoryBytes != null && service.memoryBytes > 0)
            .sort((a, b) => (b.memoryBytes ?? 0) - (a.memoryBytes ?? 0))
            .slice(0, 6)
            .map((service) => (
              <MemoryBar key={service.name} service={service} />
            ))}
        </div>
      </div>
    </div>
  );
}
