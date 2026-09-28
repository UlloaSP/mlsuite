const UNITS = ["B", "KB", "MB", "GB", "TB"];

/** Formats a byte count with binary units; missing values render as "n/a". */
export function formatBytes(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "n/a";
  let size = value;
  let index = 0;
  while (size >= 1024 && index < UNITS.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size.toFixed(size >= 10 || index === 0 ? 0 : 1)} ${UNITS[index]}`;
}
