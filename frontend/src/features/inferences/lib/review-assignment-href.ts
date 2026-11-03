import { linkOptions } from "@tanstack/react-router";
import type { SchemaReviewAssignmentStatusDto } from "@/shared/api/openapi.gen";

/** One reviewer's assignment on an inference: the page with their answers. */
export const reviewAssignmentHref = (
  inferenceId: number | string,
  assignment: Pick<SchemaReviewAssignmentStatusDto, "reviewRunId" | "reviewer">,
) =>
  linkOptions({
    to: "/inferences/$inferenceId/reviews/$reviewRunId/reviewers/$reviewerId",
    params: {
      inferenceId: String(inferenceId),
      reviewRunId: assignment.reviewRunId,
      reviewerId: String(assignment.reviewer.id),
    },
  });
