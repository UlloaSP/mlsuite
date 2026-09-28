import { RotateCcw, Trash2 } from "lucide-react";
import { Link } from "react-router";
import type { InferenceReviewAssignmentDto } from "@/features/inferences/api/inference-api";
import { assignmentActions } from "@/features/inferences/lib/use-review-assignment-actions";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import { ReviewAssignmentFacts } from "./ReviewAssignmentFacts";
import { ReviewStateBadges } from "./ReviewStateBadges";

type Props = {
  assignment: InferenceReviewAssignmentDto;
  /** The assignment's detail page (its answers). */
  to: string;
  disabled: boolean;
  onDelete: () => void;
  onReopen: () => void;
};

/** One reviewer assignment: who answers it, its state and dates; opens its answers. */
export function InferenceReviewTile({ assignment, to, disabled, onDelete, onReopen }: Props) {
  const { canReopen, canDelete } = assignmentActions(assignment);

  return (
    <article className="relative flex min-w-0 flex-col gap-4 rounded-card border border-line bg-surface p-4 transition hover:border-line-strong">
      <div className="flex items-start justify-between gap-3">
        <Link
          to={to}
          className={cx(
            "flex min-w-0 items-center gap-3 rounded-control after:absolute after:inset-0 after:rounded-card",
            FOCUS_RING,
          )}
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-subtle text-sm font-semibold text-fg">
            {assignment.reviewer.fullName.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-fg">
              {assignment.reviewer.fullName}
            </span>
            <span className="block truncate text-xs text-fg-secondary">
              {assignment.reviewer.email}
            </span>
          </span>
        </Link>
        {/* Above the stretched link, so the menu stays clickable. */}
        <div className="relative z-10">
          <AppActionsMenu
            label="Review actions"
            disabled={disabled}
            actions={[
              ...(canReopen
                ? [{ key: "reopen", label: "Reopen", icon: RotateCcw, onSelect: onReopen }]
                : []),
              ...(canDelete
                ? [
                    {
                      key: "delete",
                      label: "Delete response",
                      icon: Trash2,
                      onSelect: onDelete,
                      tone: "danger" as const,
                    },
                  ]
                : []),
            ]}
          />
        </div>
      </div>
      <ReviewStateBadges assignment={assignment} />
      <ReviewAssignmentFacts assignment={assignment} />
    </article>
  );
}
