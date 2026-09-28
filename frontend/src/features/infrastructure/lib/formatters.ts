export function formatPercent(value: number | null | undefined) {
  return value == null ? "n/a" : `${value.toFixed(1)}%`;
}

export function formatTimestamp(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
