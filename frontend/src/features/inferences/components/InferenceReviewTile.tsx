import { Ellipsis, RotateCcw, Trash2 } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { InferenceReviewAssignmentDto } from "@/features/inferences/api/inference-api";
import { formatTimestamp } from "@/shared/lib/date-time";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppIconButton } from "@/shared/ui/AppIconButton";

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
        {canReopen || hasResponse ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <AppIconButton disabled={disabled} aria-label="Review actions">
                <Ellipsis size={18} />
              </AppIconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-(--z-popover) min-w-48 rounded-menu border border-line bg-surface p-2 shadow-hover"
              >
                {canReopen ? (
                  <DropdownMenu.Item
                    onSelect={onReopen}
                    className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium outline-none hover:bg-surface-muted focus:bg-surface-muted"
                  >
                    <RotateCcw size={15} />
                    Reopen
                  </DropdownMenu.Item>
                ) : null}
                {hasResponse ? (
                  <DropdownMenu.Item
                    onSelect={onDelete}
                    className="flex cursor-pointer items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium text-danger-fg outline-none hover:bg-danger-subtle focus:bg-danger-subtle"
                  >
                    <Trash2 size={15} />
                    Delete response
                  </DropdownMenu.Item>
                ) : null}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : null}
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
