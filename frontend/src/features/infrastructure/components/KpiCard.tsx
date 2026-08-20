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
    <div className="relative overflow-hidden rounded-xl border border-[var(--border-soft)] bg-[var(--surface-primary)] px-4 pb-3 pt-3.5">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-xl font-medium tracking-tight text-[var(--text-primary)]">
        {value}
      </p>
      <p className="mt-1 text-[0.68rem] text-[var(--text-secondary)]">{sub}</p>
      {data.length > 0 && <Sparkline data={data} color={color} />}
    </div>
  );
}
