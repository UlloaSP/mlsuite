/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { cx } from "../../../app/components";
import {
  buildDashboardAlerts,
  countHealthyServices,
} from "../../../algorithms/admin/infrastructure/dashboard-summary";
import { formatBytes } from "../../../algorithms/admin/infrastructure/formatters";
import type { InfrastructureOverviewDto } from "../../../api/infrastructure/dtos";
import { CountCell, MemoryBar, ServiceHealthSegment } from "./OverviewViewSupport";
import { alertTone } from "../../../algorithms/admin/infrastructure/alert-tone";

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
    <div className="overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-5 py-3.5">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Operational signals</p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            {alerts.length} active in last 60m
          </p>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          onClick={() => onNavigateTab("alerts")}
        >
          View all
        </button>
      </div>
      <div className="divide-y divide-[var(--border-soft)]">
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
              <p className="text-xs font-medium text-[var(--text-primary)]">{alert.title}</p>
              <p className="mt-0.5 text-[0.68rem] text-[var(--text-secondary)]">{alert.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
            {overview.services.map((s) => (
              <ServiceHealthSegment key={s.name} service={s} />
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
                overview.services.filter(
                  (s) => s.status === "running" && s.health != null && s.health !== "healthy",
                ).length
              }
              color="#d97706"
            />
            <CountCell
              label="Unknown"
              value={overview.services.filter((s) => s.health == null).length}
              color="var(--text-muted)"
            />
            <CountCell
              label="Down"
              value={overview.services.filter((s) => s.status !== "running").length}
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
            .filter((s) => s.memoryBytes != null && s.memoryBytes > 0)
            .sort((a, b) => (b.memoryBytes ?? 0) - (a.memoryBytes ?? 0))
            .slice(0, 6)
            .map((s) => (
              <MemoryBar key={s.name} service={s} />
            ))}
        </div>
      </div>
    </div>
  );
}
