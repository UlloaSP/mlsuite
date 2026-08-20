import type { InfrastructureOverviewDto } from "@/features/infrastructure/api/infrastructure.types";

export function ServiceHealthSegment({
  service,
}: {
  service: InfrastructureOverviewDto["services"][number];
}) {
  const ok =
    service.status === "running" && (service.health == null || service.health === "healthy");
  const degraded = service.status === "running";
  return (
    <div
      className="flex-1"
      style={{
        background: ok ? "var(--success-text)" : degraded ? "#d97706" : "var(--danger-text)",
      }}
      title={`${service.name} - ${service.status}/${service.health ?? "unknown"}`}
    />
  );
}
