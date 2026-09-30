import type { ServiceStatusDto } from "@/features/infrastructure/api/infrastructure.types";

export function serviceHealthCategory(service: ServiceStatusDto) {
  if (service.status !== "running") return "down";
  if (!service.health || service.health === "unknown") return "unknown";
  return service.health === "healthy" ? "healthy" : "degraded";
}

export function toneForServiceStatus(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "running") {
    return "success";
  }
  if (status === "paused" || status === "restarting") {
    return "warning";
  }
  if (status === "exited" || status === "dead" || status === "missing") {
    return "danger";
  }
  return "neutral";
}

export function labelForServiceHealth(health: string | null): string {
  return health ?? "health unknown";
}
