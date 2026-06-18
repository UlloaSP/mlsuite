import type { InfrastructureOverviewDto, ServiceStatusDto } from "../../../../api/infrastructure/dtos";

/**
 * DashboardAlert: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export type DashboardAlert = {
  id: string;
  title: string;
  detail: string;
  tone: "danger" | "warning" | "accent" | "success";
};

/**
 * getOverviewTimestamp: extracts a derived value without mutating input
 *
 * Purpose: summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records.
 * @param overview - Input consumed by getOverviewTimestamp; uses the summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function getOverviewTimestamp(overview: InfrastructureOverviewDto): string | null {
  return overview.history.points.at(-1)?.timestamp ?? null;
}

/**
 * countHealthyServices: counts records matching the domain predicate
 *
 * Purpose: summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records.
 * @param services - Input consumed by countHealthyServices; uses the summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function countHealthyServices(services: ServiceStatusDto[]): number {
  return services.filter((service) => isServiceHealthy(service)).length;
}

/**
 * countProblemServices: counts records matching the domain predicate
 *
 * Purpose: summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records.
 * @param services - Input consumed by countProblemServices; uses the summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function countProblemServices(services: ServiceStatusDto[]): number {
  return services.length - countHealthyServices(services);
}

/**
 * buildDashboardAlerts: constructs a new derived object from source data
 *
 * Purpose: summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records.
 * @param overview - Input consumed by buildDashboardAlerts; uses the summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records contract.
 * @param streamConnected - Input consumed by buildDashboardAlerts; uses the summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records contract.
 * @param selectedService - Input consumed by buildDashboardAlerts; uses the summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function buildDashboardAlerts(
  overview: InfrastructureOverviewDto,
  streamConnected: boolean,
  selectedService: string | null,
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  if (!streamConnected) {
    alerts.push({
      id: "stream",
      title: "Realtime stream degraded",
      detail: "WebSocket reconnecting. Snapshot data may be stale.",
      tone: "warning",
    });
  }
  const unhealthy = overview.services.filter((service) => !isServiceHealthy(service));
  for (const service of unhealthy.slice(0, 3)) {
    alerts.push({
      id: service.name,
      title: `${service.name} needs attention`,
      detail: `${service.status}${service.health ? ` • ${service.health}` : ""}${service.uptime ? ` • ${service.uptime}` : ""}`,
      tone: service.status === "missing" ? "danger" : "warning",
    });
  }
  if (selectedService) {
    const service = overview.services.find((item) => item.name === selectedService);
    if (service && !service.terminalEnabled) {
      alerts.push({
        id: "shell",
        title: "Shell not available",
        detail: `${service.name} cannot open an interactive terminal session.`,
        tone: "accent",
      });
    }
  }
  if (alerts.length) {
    return alerts;
  }
  return [
    {
      id: "healthy",
      title: "All managed services stable",
      detail: `${countHealthyServices(overview.services)} services healthy and reachable.`,
      tone: "success",
    },
  ];
}

/**
 * toneForMetric: performs the exported transformation for this algorithm.
 *
 * Purpose: summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records.
 * @param value - Input consumed by toneForMetric; uses the summarizes infrastructure dashboard snapshots into counts, timestamps, and alert records contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function toneForMetric(
  value: number | null | undefined,
): "danger" | "warning" | "success" | "neutral" {
  if (value == null) {
    return "neutral";
  }
  if (value >= 85) {
    return "danger";
  }
  if (value >= 65) {
    return "warning";
  }
  return "success";
}

/** isServiceHealthy: internal predicate for infrastructure dashboard state/display derivation. @remarks Args: service; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
function isServiceHealthy(service: ServiceStatusDto): boolean {
  return service.status === "running" && (service.health == null || service.health === "healthy");
}
