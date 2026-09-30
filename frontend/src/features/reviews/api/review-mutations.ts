import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import {
  createSchemaReviewFeedback,
  updateSchemaReviewFeedback,
  submitSchemaReviewRuns,
} from "./review-api";
import { saveSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-save";
import type { SchemaFeedbackStep } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { PREDICTION_RUN_CATALOG_QUERY_KEY } from "@/capabilities/prediction-runs/prediction-run-keys";
import { INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY } from "@/capabilities/review-creation/review-creation-api";
import { SCHEMA_REVIEW_INBOX_QUERY_KEY } from "./review-keys";

export type ReviewSubmission = { reviewId: string; reviewRunIds: string[] };

export const useSaveSchemaReviewFeedbackMutation = (reviewId: string, reviewRunId: string) => {
  const qc = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: ({
      steps,
      values,
    }: {
      steps: readonly SchemaFeedbackStep[];
      values: Record<string, unknown>;
    }) =>
      saveSchemaFeedbackSteps(steps, values, {
        create: (step, target, value) =>
          createSchemaReviewFeedback(reviewId, reviewRunId, {
            resultId: target.resultId,
            type: step.type,
            order: step.order,
            value,
          }),
        update: (_step, _target, feedback, value) =>
          updateSchemaReviewFeedback(reviewId, reviewRunId, {
            feedbackId: feedback.id,
            value,
          }),
      }),
    onSettled: () =>
      qc.invalidateQueries({ queryKey: PREDICTION_RUN_CATALOG_QUERY_KEY(organizationId) }),
  });
};

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
        qc.invalidateQueries({ queryKey: PREDICTION_RUN_CATALOG_QUERY_KEY(organizationId) }),
        qc.invalidateQueries({ queryKey: SCHEMA_REVIEW_INBOX_QUERY_KEY(organizationId) }),
        // Submitting completes the assignment every inference page lists.
        qc.invalidateQueries({
          queryKey: INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY(organizationId),
        }),
      ]),
  });
};
