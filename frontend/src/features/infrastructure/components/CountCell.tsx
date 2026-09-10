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
    <div className="bg-[var(--surface-primary)] px-3.5 py-2.5">
      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-1 font-mono text-base font-medium" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
