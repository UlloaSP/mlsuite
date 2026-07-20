import { useState } from "react";
import { Filter, RefreshCw, Search } from "lucide-react";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { cx } from "@/shared/ui/cx";
import { formatBytes, formatPercent } from "@/features/infrastructure/lib/formatters";
import { labelForServiceHealth, toneForServiceStatus } from "@/features/infrastructure/lib/status";
import type { ServiceStatusDto } from "@/features/infrastructure/api/infrastructure.types";
import { SegmentedControl } from "./ServicesSegmentedControl";
import { SortTh } from "./ServicesSortTh";
import { ActionBtn } from "./ServicesViewSupport";
import {
  filterAndSortServices,
  serviceStatusCounts,
  type ServiceSort,
  type SortKey,
} from "./services-view-model";
type Props = {
  services: ServiceStatusDto[];
  selectedService: string | null;
  busyService: string | null;
  onSelect: (serviceName: string) => void;
  onAction: (serviceName: string, action: "START" | "STOP" | "RESTART") => void;
};
export function ServicesView({
  services,
  selectedService,
  busyService,
  onSelect,
  onAction,
}: Props) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");
  const [sort, setSort] = useState<ServiceSort>({
    key: "name",
    dir: "asc",
  });
  const toggleSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" },
    );
  const filtered = filterAndSortServices(services, {
    query,
    status: statusFilter,
    health: healthFilter,
    sort,
  });
  const counts = serviceStatusCounts(services);
  const activeFilters =
    (query ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (healthFilter !== "all" ? 1 : 0);
  const clearFilters = () => {
    setQuery("");
    setStatusFilter("all");
    setHealthFilter("all");
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            Service control
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Managed services
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {filtered.length} of {services.length} services &middot; click a row for details, logs,
            and shell.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AppButton variant="secondary" className="gap-2 px-3 py-2 text-xs">
            <RefreshCw size={13} /> Sync
          </AppButton>
        </div>
      </div>
      <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-soft)] px-4 py-3">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-primary)] px-3 py-1.5">
            <Search size={14} className="text-[var(--text-muted)]" />
            <input
              aria-label="Filter services"
              type="text"
              placeholder="Filter by name or container…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-56 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
            />
          </label>
          <SegmentedControl
            options={[
              { key: "all", label: `All ${counts.all}` },
              { key: "running", label: `Running ${counts.running}` },
              { key: "stopped", label: `Stopped ${counts.stopped}` },
              { key: "restarting", label: `Restarting ${counts.restarting}` },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
          <AppSelect
            aria-label="Filter by service health"
            className="h-8 min-w-32 px-3 text-xs"
            value={healthFilter}
            onValueChange={setHealthFilter}
            options={[
              { value: "all", label: "All health" },
              { value: "healthy", label: "Healthy" },
              { value: "degraded", label: "Degraded" },
              { value: "unknown", label: "Unknown" },
            ]}
          />
          <div className="flex-1" />
          <span className="flex items-center gap-1.5 text-[0.68rem] text-[var(--text-secondary)]">
            <Filter size={11} />
            {activeFilters} active filter(s)
          </span>
          {activeFilters > 0 && (
            <button
              type="button"
              className="text-[0.68rem] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--border-soft)] bg-[var(--surface-primary)]">
                <SortTh label="Service" sortKey="name" sort={sort} onSort={toggleSort} />
                <th className="px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                  State
                </th>
                <th className="px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                  Health
                </th>
                <SortTh label="Uptime" sortKey="uptime" sort={sort} onSort={toggleSort} />
                <SortTh label="CPU" sortKey="cpuPercent" sort={sort} onSort={toggleSort} />
                <SortTh label="Memory" sortKey="memoryBytes" sort={sort} onSort={toggleSort} />
                <th className="px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                  Ports
                </th>
                <th className="px-4 py-2.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => {
                const active = s.name === selectedService;
                const busy = s.name === busyService;
                return (
                  <tr
                    key={s.name}
                    tabIndex={0}
                    className={cx(
                      "cursor-pointer border-b border-[var(--border-soft)] transition",
                      active ? "bg-[var(--accent-quiet)]" : "hover:bg-[var(--surface-muted)]",
                    )}
                    onClick={() => onSelect(s.name)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onSelect(s.name);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cx(
                            "size-2 rounded-full",
                            s.status === "running"
                              ? "bg-emerald-500"
                              : s.status === "exited" || s.status === "dead"
                                ? "bg-rose-500"
                                : "bg-amber-500",
                          )}
                        />
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{s.name}</p>
                          <p className="mt-0.5 text-[0.65rem] text-[var(--text-muted)]">
                            {s.containerName ?? "container missing"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <AppBadge
                        tone={toneForServiceStatus(s.status)}
                        className="px-2 py-0.5 text-[0.6rem]"
                      >
                        {s.status}
                      </AppBadge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[var(--text-secondary)]">
                        {labelForServiceHealth(s.health)}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-[var(--text-secondary)]">
                      {s.uptime ?? "n/a"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (s.cpuPercent ?? 0) * 4)}%`,
                              background:
                                (s.cpuPercent ?? 0) > 10
                                  ? "var(--warning-text)"
                                  : "var(--accent-primary)",
                            }}
                          />
                        </div>
                        <span className="font-mono text-[var(--text-secondary)]">
                          {formatPercent(s.cpuPercent)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-12 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                          <div
                            className="h-full rounded-full bg-[var(--accent-primary)]"
                            style={{
                              width: `${Math.min(100, ((s.memoryBytes ?? 0) / (512 * 1024 * 1024)) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="font-mono text-[var(--text-secondary)]">
                          {formatBytes(s.memoryBytes)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-[0.65rem] text-[var(--text-muted)]">
                      {s.ports.length > 0 ? s.ports.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {s.status !== "running" ? (
                          <ActionBtn
                            action="START"
                            label="Start"
                            disabled={busy}
                            onClick={() => onAction(s.name, "START")}
                          />
                        ) : (
                          <ActionBtn
                            action="STOP"
                            label="Stop"
                            disabled={busy}
                            onClick={() => onAction(s.name, "STOP")}
                          />
                        )}
                        <ActionBtn
                          action="RESTART"
                          label="Restart"
                          disabled={busy}
                          danger
                          onClick={() => onAction(s.name, "RESTART")}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-sm text-[var(--text-muted)]"
                  >
                    No services match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
