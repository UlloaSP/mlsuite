import type { InferenceReviewAssignmentDto } from "@/features/inferences/api/inference-api";
import { formatTimestamp } from "@/shared/lib/date-time";

/**
 * Who asked for the review and when, when it was submitted, and — while it is
 * still open — when it expires.
 */
export function ReviewAssignmentFacts({
  assignment,
  inline = false,
}: {
  assignment: InferenceReviewAssignmentDto;
  /** Side by side, for wide panels; stacked (the default) in tiles. */
  inline?: boolean;
}) {
  const completed = assignment.reviewState === "COMPLETED";
  const facts = [
    {
      label: "Requested by",
      value: `${assignment.createdBy.fullName} · ${formatTimestamp(assignment.createdAt)}`,
    },
    {
      label: "Submitted",
      value: assignment.submittedAt ? formatTimestamp(assignment.submittedAt) : "Not yet",
    },
    ...(completed
      ? []
      : [
          {
            label: assignment.expired ? "Expired" : "Expires",
            value: formatTimestamp(assignment.expiresAt),
          },
        ]),
  ];

  return (
    <dl className={inline ? "grid gap-4 text-sm sm:grid-cols-3" : "grid gap-3 text-xs"}>
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt className="text-fg-muted">{fact.label}</dt>
          <dd className="mt-1 text-fg">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}
