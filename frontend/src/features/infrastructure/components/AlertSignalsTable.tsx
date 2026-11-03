import { formatMeasure } from "@/shared/lib/format-measure";
import type { SystemAlertSignalDto } from "@/shared/api/openapi.gen";

const HEADERS = ["Signal", "Now", "Warning at", "Critical at", "Clears under"];

const now = ({ value, unit }: SystemAlertSignalDto) => {
  if (value === null) return "Unknown";
  // A signal without a unit is a state: one means its condition stands.
  if (unit === "") return value > 0 ? "Yes" : "No";
  return formatMeasure(value, unit);
};

const limit = (value: number | null, unit: string) =>
  value === null || unit === "" ? "—" : formatMeasure(value, unit);

export function AlertSignalsTable({ signals }: { signals: SystemAlertSignalDto[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-fg-muted">
          <tr>
            {HEADERS.map((header) => (
              <th key={header} scope="col" className="whitespace-nowrap px-5 py-2.5 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line text-fg-secondary">
          {signals.map((signal) => (
            <tr key={signal.signal}>
              <th scope="row" className="whitespace-nowrap px-5 py-2.5 font-medium text-fg">
                {signal.label}
              </th>
              <td className="whitespace-nowrap px-5 py-2.5 text-fg">{now(signal)}</td>
              <td className="whitespace-nowrap px-5 py-2.5">
                {limit(signal.warningThreshold, signal.unit)}
              </td>
              <td className="whitespace-nowrap px-5 py-2.5">
                {limit(signal.criticalThreshold, signal.unit)}
              </td>
              <td className="whitespace-nowrap px-5 py-2.5">
                {limit(signal.clearThreshold, signal.unit)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
