import { formatTimestamp } from "@/shared/lib/date-time";
import { cx } from "@/shared/ui/cx";
import type { SchemaReviewRunListItemDto } from "@/shared/api/openapi.gen";

type ReviewTrayRowProps = {
  item: SchemaReviewRunListItemDto & { schemaName: string };
  tone: "revision" | "pending";
  active: boolean;
  onSelect: () => void;
};

export function ReviewTrayRow({ item, tone, active, onSelect }: ReviewTrayRowProps) {
  const enteredAt = item.stateEnteredAt ?? item.run.createdAt;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "relative w-full border-b border-line px-3 py-3 text-left transition last:border-b-0",
        !active && "bg-surface hover:bg-surface-muted",
        active && (tone === "revision" ? "bg-success-subtle" : "bg-warning-subtle"),
      )}
    >
      <span className="block truncate pr-5 text-sm font-semibold text-fg">
        {item.schemaName} · {item.run.name}
      </span>
      <span className="mt-1.5 block text-xs text-fg-secondary">
        {tone === "revision" ? "Feedback saved" : "Entered pending"} · {formatTimestamp(enteredAt)}
      </span>
      <span
        className={cx(
          "absolute right-3 top-1/2 size-2.5 -translate-y-1/2 rounded-full",
          tone === "revision" ? "bg-success" : "bg-warning",
        )}
      />
    </button>
  );
}
