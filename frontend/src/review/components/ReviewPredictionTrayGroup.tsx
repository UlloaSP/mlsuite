import { ChevronUp } from "lucide-react";
import type { ReactNode, RefObject } from "react";

type ReviewPredictionTrayGroupProps = {
  title: string;
  subtitle: string;
  count: number;
  tone: "revision" | "pending";
  open: boolean;
  listHeight: number;
  sectionRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLDivElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  onToggle: () => void;
  children: ReactNode;
};

export function ReviewPredictionTrayGroup({
  title,
  subtitle,
  count,
  tone,
  open,
  listHeight,
  sectionRef,
  headerRef,
  listRef,
  onToggle,
  children,
}: ReviewPredictionTrayGroupProps) {
  const dotColor = tone === "revision" ? "bg-[#16a34a]" : "bg-[#f59e0b]";
  const countTone =
    tone === "revision"
      ? "bg-[var(--success-quiet)] text-[var(--success-text)]"
      : "bg-[var(--warning-quiet)] text-[var(--warning-text)]";

  return (
    <section
      ref={sectionRef}
      className="shrink-0 border-b border-[var(--border-soft)] pb-4 last:border-b-0"
    >
      <div ref={headerRef} className="flex shrink-0 items-center gap-3">
        <span className={`size-2.5 rounded-full ${dotColor}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">{title}</p>
          <p className="text-xs text-[var(--text-secondary)]">{subtitle}</p>
        </div>
        <span className={`rounded-md px-2.5 py-1.5 text-xs font-semibold ${countTone}`}>
          {count}
        </span>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="flex size-8 items-center justify-center rounded-md bg-[var(--surface-muted)] text-[var(--text-primary)]"
        >
          <ChevronUp size={14} className={open ? "" : "rotate-180"} />
        </button>
      </div>
      {open && count > 0 ? (
        <div
          ref={listRef}
          className="mt-3 overflow-y-auto"
          style={{ maxHeight: `${listHeight}px` }}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}
