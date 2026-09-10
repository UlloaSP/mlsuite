import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { submitSchemaReviewRuns } from "./review-api";
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
      qc.invalidateQueries({
        queryKey: SCHEMA_REVIEW_INBOX_QUERY_KEY(organizationId),
      }),
  });
};
