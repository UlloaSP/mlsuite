import { Sparkline } from "./Sparkline";

export function KpiCard({
  label,
  value,
  sub,
  data,
  color,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "danger" | "warning" | "success" | "neutral";
  data: Array<{ v: number }>;
  color: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface px-4 pb-3 pt-3.5">
      <p className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-secondary">{label}</p>
      <p className="mt-1.5 text-lg font-semibold tracking-tight text-fg tabular-nums">{value}</p>
      <p className="mt-1 text-2xs text-fg-secondary">{sub}</p>
      {data.length > 0 && <Sparkline data={data} color={color} />}
    </div>
  );
}
