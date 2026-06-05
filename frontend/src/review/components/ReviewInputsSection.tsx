type ReviewInputsSectionProps = {
  inputs: Record<string, unknown>;
};

export function ReviewInputsSection({ inputs }: ReviewInputsSectionProps) {
  return (
    <div className="divide-y divide-[var(--border-soft)]">
      {Object.entries(inputs).map(([key, value]) => (
        <div
          key={key}
          className="grid min-w-0 gap-2 py-3 md:grid-cols-[minmax(0,1fr)_minmax(6rem,auto)]"
        >
          <p className="min-w-0 break-words text-sm font-semibold text-[var(--text-primary)]">
            {key}
          </p>
          <p className="min-w-0 break-words font-mono text-sm text-[var(--text-primary)] md:text-right">
            {typeof value === "number" ? value.toLocaleString() : String(value)}
          </p>
        </div>
      ))}
    </div>
  );
}
