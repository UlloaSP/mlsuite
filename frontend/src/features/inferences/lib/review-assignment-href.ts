import type { SchemaReviewAssignmentStatusDto } from "@/shared/api/openapi.gen";

/** One reviewer's assignment on an inference: the page with their answers. */
export const reviewAssignmentHref = (
  inferenceId: number | string,
  assignment: Pick<SchemaReviewAssignmentStatusDto, "reviewRunId" | "reviewer">,
) =>
  `/inferences/${inferenceId}/reviews/${encodeURIComponent(assignment.reviewRunId)}/reviewers/${assignment.reviewer.id}`;
