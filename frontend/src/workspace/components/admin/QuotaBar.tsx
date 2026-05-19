export function QuotaBar({ used = 0, limit }: { used?: number; limit?: number | null }) {
  if (!limit) {
    return <span className="text-xs text-[var(--text-secondary)]">No quota</span>;
  }
  const pct = Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="flex min-w-[160px] items-center gap-2">
      <div className="h-2 flex-1 rounded-full bg-[var(--surface-tertiary)]">
        <div className="h-2 rounded-full bg-[var(--text-primary)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[var(--text-secondary)]">
        {used}/{limit}
      </span>
    </div>
  );
}
