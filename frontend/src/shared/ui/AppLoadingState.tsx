export function AppLoadingState({ compact = false, label }: { compact?: boolean; label: string }) {
  return (
    <div
      role="status"
      className={`flex w-full items-center justify-center bg-[var(--page-bg)] ${compact ? "min-h-16 px-4" : "min-h-40 px-6"}`}
    >
      <span className="sr-only">{label}</span>
      <div aria-hidden="true" className="w-full max-w-xl space-y-4">
        <div className="h-2 w-2/3 animate-pulse bg-[var(--accent-primary)] motion-reduce:animate-none" />
        <div className="h-2 w-full animate-pulse bg-[var(--surface-muted)] motion-reduce:animate-none" />
        <div className="h-2 w-5/6 animate-pulse bg-[var(--surface-muted)] motion-reduce:animate-none" />
      </div>
    </div>
  );
}
