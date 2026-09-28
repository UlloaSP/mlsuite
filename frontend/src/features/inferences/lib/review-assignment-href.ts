import type { InferenceReviewAssignmentDto } from "@/features/inferences/api/inference-api";

/** One reviewer's assignment on an inference: the page with their answers. */
export const reviewAssignmentHref = (
  inferenceId: number | string,
  assignment: Pick<InferenceReviewAssignmentDto, "reviewRunId" | "reviewer">,
) =>
  `/inferences/${inferenceId}/reviews/${encodeURIComponent(assignment.reviewRunId)}/reviewers/${assignment.reviewer.id}`;
