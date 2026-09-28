import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { submitSchemaReviewRuns } from "./review-api";
import { INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY } from "@/capabilities/review-creation/review-creation-api";
import { SCHEMA_REVIEW_INBOX_QUERY_KEY } from "./review-keys";

export type ReviewSubmission = { reviewId: string; reviewRunIds: string[] };

export const useSubmitSchemaReviewInboxMutation = () => {
  const qc = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    mutationFn: (submissions: ReviewSubmission[]) =>
      Promise.all(
        submissions.map(({ reviewId, reviewRunIds }) =>
          submitSchemaReviewRuns(reviewId, reviewRunIds),
        ),
      ),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_INBOX_QUERY_KEY(organizationId) }),
        // Submitting completes the assignment every inference page lists.
        qc.invalidateQueries({
          queryKey: INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY(organizationId),
        }),
      ]),
  });
};
