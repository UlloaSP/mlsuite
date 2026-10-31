import { countLabel } from "./purge-labels";

/** What a purge would destroy, or destroyed, leaving out what it did not touch. */
export function PurgeCounts({ counts }: { counts: Record<string, number> }) {
  const shown = Object.entries(counts).filter(([key, value]) => value > 0 && countLabel(key));
  if (shown.length === 0) return <p className="text-sm text-fg-muted">Nothing counted yet.</p>;
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
      {shown.map(([key, value]) => (
        <div key={key} className="flex items-baseline justify-between gap-3">
          <dt className="text-fg-secondary">{countLabel(key)}</dt>
          <dd className="font-medium tabular-nums text-fg">{value.toLocaleString()}</dd>
        </div>
      ))}
    </dl>
  );
}
