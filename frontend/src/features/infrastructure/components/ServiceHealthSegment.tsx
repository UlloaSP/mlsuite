import { serviceHealthCategory } from "@/features/infrastructure/lib/status";
import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";

export function ServiceHealthSegment({
  service,
}: {
  service: InfrastructureOverviewDto["services"][number];
}) {
  const category = serviceHealthCategory(service);
  const colors = {
    healthy: "var(--success-text)",
    unknown: "var(--text-muted)",
    degraded: "var(--warning-text)",
    down: "var(--danger-text)",
  };
  return (
    <div
      className="flex-1"
      style={{
        background: colors[category],
      }}
      title={`${service.name} - ${service.status}/${service.health ?? "unknown"}`}
    />
  );
}
