import { RotateCcw, Trash2 } from "lucide-react";
import type { InferenceReviewAssignmentDto } from "@/features/inferences/api/inference-api";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";

type Props = {
  assignment: InferenceReviewAssignmentDto;
  disabled: boolean;
  onDelete: () => void;
  onReopen: () => void;
};

const tone = (state: InferenceReviewAssignmentDto["reviewState"]) =>
  state === "COMPLETED" ? "success" : state === "IN_PROGRESS" ? "accent" : "neutral";

const label = (state: InferenceReviewAssignmentDto["reviewState"]) =>
  state === "IN_PROGRESS" ? "In progress" : state === "COMPLETED" ? "Completed" : "Pending";

export function InferenceReviewTile({ assignment, disabled, onDelete, onReopen }: Props) {
  const hasResponse = assignment.reviewState !== "PENDING";
  const canReopen = assignment.reviewState === "COMPLETED" && !assignment.expired;

  return (
    <article className="flex min-w-0 flex-col rounded-card border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-subtle text-sm font-semibold text-fg">
            {assignment.reviewer.fullName.trim().charAt(0).toUpperCase() || "?"}
          </span>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-fg">{assignment.reviewer.fullName}</h3>
            <p className="truncate text-xs text-fg-secondary">{assignment.reviewer.email}</p>
          </div>
        </div>
        <AppActionsMenu
          label="Review actions"
          disabled={disabled}
          actions={[
            ...(canReopen
              ? [{ key: "reopen", label: "Reopen", icon: RotateCcw, onSelect: onReopen }]
              : []),
            ...(hasResponse
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
      <div className="mt-5 flex flex-wrap gap-2">
        <AppBadge tone={tone(assignment.reviewState)}>{label(assignment.reviewState)}</AppBadge>
        {assignment.expired ? <AppBadge tone="warning">Expired</AppBadge> : null}
      </div>
      <dl className="mt-5 grid gap-3 text-xs">
        <div>
          <dt className="text-fg-muted">Submitted</dt>
          <dd className="mt-1 text-fg">
            {assignment.submittedAt ? formatTimestamp(assignment.submittedAt) : "Not submitted"}
          </dd>
        </div>
        <div>
          <dt className="text-fg-muted">Review request</dt>
          <dd className="mt-1 text-fg">
            Created by {assignment.createdBy.fullName} · {formatTimestamp(assignment.createdAt)}
          </dd>
          <dd className="mt-1 text-fg-secondary">
            Expires {formatTimestamp(assignment.expiresAt)}
          </dd>
        </div>
      </dl>
    </article>
  );
}
