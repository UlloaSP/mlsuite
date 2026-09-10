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
      <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
        <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Services at a glance</p>
            <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
              {running} running &middot; {issues} need attention
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            onClick={() => onNavigateTab("services")}
          >
            Manage <ChevronRight size={12} />
          </button>
        </div>
        <div className="px-5 py-4">
          <div className="mb-4 flex h-2 gap-0.5 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            {overview.services.map((service) => (
              <ServiceHealthSegment key={service.name} service={service} />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--border-soft)]">
            <CountCell
              label="Healthy"
              value={countHealthyServices(overview.services)}
              color="var(--success-text)"
            />
            <CountCell
              label="Degraded"
              value={
                overview.services.filter((service) => serviceHealthCategory(service) === "degraded")
                  .length
              }
              color="#d97706"
            />
            <CountCell
              label="Unknown"
              value={
                overview.services.filter((service) => serviceHealthCategory(service) === "unknown")
                  .length
              }
              color="var(--text-muted)"
            />
            <CountCell
              label="Down"
              value={
                overview.services.filter((service) => serviceHealthCategory(service) === "down")
                  .length
              }
              color="var(--danger-text)"
            />
          </div>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
        <div className="border-b border-[var(--border-soft)] px-5 py-3.5">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Memory usage by service
          </p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {formatBytes(totalMem)} allocated
          </p>
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
