/**
 * formatPercent: converts raw data into a stable human-readable string
 *
 * Purpose: formats infrastructure numbers and timestamps for stable display.
 * @param value - Input consumed by formatPercent; uses the formats infrastructure numbers and timestamps for stable display contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function formatPercent(value: number | null | undefined) {
  return value == null ? "n/a" : `${value.toFixed(1)}%`;
}

/**
 * formatBytes: converts raw data into a stable human-readable string
 *
 * Purpose: formats infrastructure numbers and timestamps for stable display.
 * @param value - Input consumed by formatBytes; uses the formats infrastructure numbers and timestamps for stable display contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function formatBytes(value: number | null | undefined) {
  if (value == null) {
    return "n/a";
  }
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

/**
 * formatTimestamp: converts raw data into a stable human-readable string
 *
 * Purpose: formats infrastructure numbers and timestamps for stable display.
 * @param value - Input consumed by formatTimestamp; uses the formats infrastructure numbers and timestamps for stable display contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
