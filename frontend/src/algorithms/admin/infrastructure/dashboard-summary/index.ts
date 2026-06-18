import type { InfrastructureOverviewDto, ServiceStatusDto } from "../../../../admin/infrastructure/types";

export type DashboardAlert = {
  id: string;
  title: string;
  detail: string;
  tone: "danger" | "warning" | "accent" | "success";
};

export function getOverviewTimestamp(overview: InfrastructureOverviewDto): string | null {
  return overview.history.points.at(-1)?.timestamp ?? null;
}

export function countHealthyServices(services: ServiceStatusDto[]): number {
  return services.filter((service) => isServiceHealthy(service)).length;
}

export function countProblemServices(services: ServiceStatusDto[]): number {
  return services.length - countHealthyServices(services);
}

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

function isServiceHealthy(service: ServiceStatusDto): boolean {
  return service.status === "running" && (service.health == null || service.health === "healthy");
}
