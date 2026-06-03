import { Send } from "lucide-react";
import type { SchemaReviewRunListItemDto } from "../api/schemaReviewLinkService";

type Props = {
  items: SchemaReviewRunListItemDto[];
  selectedRunToken?: string;
  submitting?: boolean;
  onSelect: (runToken: string) => void;
  onSubmitRevision: (runTokens: string[]) => void;
};

export function SchemaReviewRunRail({
  items,
  selectedRunToken,
  submitting = false,
  onSelect,
  onSubmitRevision,
}: Props) {
  const revision = items.filter((item) => item.reviewState === "REVISION");
  const pending = items.filter((item) => item.reviewState === "PENDING");
  const revisionTokens = revision.map((item) => item.selectionToken);
  const groups = [
    ["Revision", revision],
    ["Pending", pending],
  ] as const;
  return (
    <aside className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface-primary)] p-5 lg:sticky lg:top-28">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold text-[var(--text-primary)]">Review tray</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Saved runs move to revision.</p>
        </div>
        <span className="grid size-10 place-items-center rounded-md bg-[var(--surface-muted)]">
          <Send size={17} />
        </span>
      </div>
      <button
        type="button"
        disabled={revisionTokens.length === 0 || submitting}
        onClick={() => onSubmitRevision(revisionTokens)}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
      >
        <Send size={15} />
        Send revision ({revisionTokens.length})
      </button>
      <div className="mt-5 space-y-5">
        {groups.map(([title, rows]) => (
          <section key={title} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {title} ({rows.length})
            </p>
            {rows.map((item) => (
              <button
                key={item.selectionToken}
                type="button"
                onClick={() => onSelect(item.selectionToken)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  item.selectionToken === selectedRunToken
                    ? "border-[var(--accent-primary)] bg-[var(--surface-muted)]"
                    : "border-[var(--border-soft)]"
                }`}
              >
                <span className="block truncate font-semibold">{item.run.name}</span>
                <span className="text-xs text-[var(--text-secondary)]">{item.run.status}</span>
              </button>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}
