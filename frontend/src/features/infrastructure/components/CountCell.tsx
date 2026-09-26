export function CountCell({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-surface px-3.5 py-2.5">
      <p className="text-3xs font-semibold uppercase tracking-[0.1em] text-fg-secondary">{label}</p>
      <p className="mt-1 font-mono text-base font-medium" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
