import { formatBytes } from "@/features/infrastructure/lib/formatters";

export function MemoryBar({
  service,
}: {
  service: { name: string; memoryBytes: number | null; memoryLimitBytes: number | null };
}) {
  const bytes = service.memoryBytes ?? 0;
  const limit = service.memoryLimitBytes ?? 512 * 1024 * 1024;
  const percent = Math.min(100, (bytes / limit) * 100);
  return (
    <div className="grid grid-cols-[110px_1fr_70px] items-center gap-3 py-1.5">
      <p className="truncate text-xs text-fg">{service.name}</p>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
      <p className="text-right font-mono text-2xs text-fg-secondary">{formatBytes(bytes)}</p>
    </div>
  );
}
