import { AppSkeleton } from "./AppSkeleton";
import { cx } from "./cx";

const ROW_KEYS = ["a", "b", "c", "d", "e", "f"];

/**
 * Skeleton rows for data that is still loading inside a page, panel, or dialog.
 * `compact` stands in for a short inline list; the default mirrors catalog cards.
 */
export function AppLoadingState({
  compact = false,
  label,
  layout = "list",
  rows = compact ? 2 : 4,
}: {
  compact?: boolean;
  label: string;
  layout?: "grid" | "list";
  rows?: number;
}) {
  return (
    <div
      role="status"
      className={cx(
        "app-loading-reveal w-full",
        layout === "grid" ? "grid gap-3 md:grid-cols-2 xl:grid-cols-3" : "flex flex-col gap-3",
      )}
    >
      <span className="sr-only">{label}</span>
      {ROW_KEYS.slice(0, rows).map((key) =>
        compact ? (
          <div key={key} aria-hidden="true" className="flex items-center gap-3 py-1">
            <AppSkeleton className="size-8 shrink-0 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <AppSkeleton className="h-3 w-2/5" />
              <AppSkeleton className="h-3 w-3/4" />
            </div>
          </div>
        ) : (
          <div
            key={key}
            aria-hidden="true"
            className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4"
          >
            <AppSkeleton className="h-4 w-1/3" />
            <AppSkeleton className="h-3 w-4/5" />
            <AppSkeleton className="h-3 w-3/5" />
          </div>
        ),
      )}
    </div>
  );
}
