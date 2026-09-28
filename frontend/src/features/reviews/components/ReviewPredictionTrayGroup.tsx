import { ChevronUp } from "lucide-react";
import type { ReactNode } from "react";

type ReviewPredictionTrayGroupProps = {
  title: string;
  subtitle: string;
  count: number;
  tone: "revision" | "pending";
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function ReviewPredictionTrayGroup({
  title,
  subtitle,
  count,
  tone,
  open,
  onToggle,
  children,
}: ReviewPredictionTrayGroupProps) {
  const dotColor = tone === "revision" ? "bg-success" : "bg-warning";
  const countTone =
    tone === "revision" ? "bg-success-subtle text-success-fg" : "bg-warning-subtle text-warning-fg";

  return (
    <section className="flex flex-col border-b border-line pb-4 last:border-b-0 xl:min-h-0">
      <div className="flex shrink-0 items-center gap-3">
        <span className={`size-2.5 rounded-full ${dotColor}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{title}</p>
          <p className="text-xs text-fg-secondary">{subtitle}</p>
        </div>
        <span className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${countTone}`}>
          {count}
        </span>
        <button
          type="button"
          aria-label={`${open ? "Collapse" : "Expand"} ${title}`}
          onClick={onToggle}
          aria-expanded={open}
          className="flex size-8 items-center justify-center rounded-md bg-surface-muted text-fg"
        >
          <ChevronUp size={14} className={open ? "" : "rotate-180"} />
        </button>
      </div>
      {open && count > 0 ? <div className="mt-3 overflow-y-auto xl:min-h-0">{children}</div> : null}
    </section>
  );
}
