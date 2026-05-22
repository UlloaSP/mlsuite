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
