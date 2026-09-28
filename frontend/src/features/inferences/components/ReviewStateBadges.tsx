import { AppBadge } from "@/shared/ui/AppBadge";
import type { SchemaReviewAssignmentStatusDto } from "@/shared/api/openapi.gen";

type State = SchemaReviewAssignmentStatusDto["reviewState"];

const TONE = { COMPLETED: "success", IN_PROGRESS: "accent", PENDING: "neutral" } as const;
const LABEL: Record<State, string> = {
  COMPLETED: "Completed",
  IN_PROGRESS: "In progress",
  PENDING: "Pending",
};

export function ReviewStateBadges({ assignment }: { assignment: SchemaReviewAssignmentStatusDto }) {
  return (
    <div className="flex flex-wrap gap-2">
      <AppBadge tone={TONE[assignment.reviewState]}>{LABEL[assignment.reviewState]}</AppBadge>
      {assignment.expired ? <AppBadge tone="warning">Expired</AppBadge> : null}
    </div>
  );
}
