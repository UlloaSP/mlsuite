/**
 * toneForServiceStatus: performs the exported transformation for this algorithm.
 *
 * Purpose: maps service health/status values to labels and visual tones.
 * @param status - Input consumed by toneForServiceStatus; uses the maps service health/status values to labels and visual tones contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/**
 * labelForServiceHealth: performs the exported transformation for this algorithm.
 *
 * Purpose: maps service health/status values to labels and visual tones.
 * @param health - Input consumed by labelForServiceHealth; uses the maps service health/status values to labels and visual tones contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function labelForServiceHealth(health: string | null): string {
  return health ?? "health unknown";
}
