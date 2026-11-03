import { appFetch, json } from "@/shared/api/http";
import { mutationOptions, useMutation } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import {
  createSchemaReviewFeedback,
  submitSchemaReviewRuns,
  updateSchemaReviewFeedback,
} from "./review-api";
import { saveSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-save";
import type { SchemaFeedbackStep } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { PREDICTION_RUN_CATALOG_QUERY_KEY } from "@/capabilities/prediction-runs/prediction-run-keys";
import { INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY } from "@/capabilities/review-creation/review-creation-api";
import { SCHEMA_REVIEW_INBOX_QUERY_KEY } from "./review-keys";

const saveSchemaReviewFeedbackMutation = (
  organizationId: number | string,
  reviewId: string,
  reviewRunId: string,
) =>
  mutationOptions({
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
    // A saved answer can complete the item, which changes how the inbox lists it.
    onSuccess: (_data, _variables, _result, { client }) =>
      client.invalidateQueries({ queryKey: SCHEMA_REVIEW_INBOX_QUERY_KEY(organizationId) }),
    onSettled: (_data, _error, _variables, _result, { client }) =>
      client.invalidateQueries({ queryKey: PREDICTION_RUN_CATALOG_QUERY_KEY(organizationId) }),
  });

export const useSaveSchemaReviewFeedbackMutation = (reviewId: string, reviewRunId: string) =>
  useMutation(
    saveSchemaReviewFeedbackMutation(useCurrentOrganizationId() ?? "none", reviewId, reviewRunId),
  );

/** Completes one item of a review that asks no questions; the inbox then lists it as done. */
const completeSchemaReviewRunMutation = (
  organizationId: number | string,
  reviewId: string,
  reviewRunId: string,
) =>
  mutationOptions({
    meta: { errorHandledLocally: true },
    mutationFn: () => submitSchemaReviewRuns(reviewId, [reviewRunId]),
    onSuccess: (_data, _variables, _result, { client }) =>
      client.invalidateQueries({ queryKey: SCHEMA_REVIEW_INBOX_QUERY_KEY(organizationId) }),
  });

export const useCompleteSchemaReviewRunMutation = (reviewId: string, reviewRunId: string) =>
  useMutation(
    completeSchemaReviewRunMutation(useCurrentOrganizationId() ?? "none", reviewId, reviewRunId),
  );

const submitSchemaReviewInboxMutation = (organizationId: number | string) =>
  mutationOptions({
    mutationFn: () => appFetch<void>("/api/schema-reviews/inbox/submit-pending", json("POST", {})),
    onSuccess: (_data, _variables, _result, { client }) =>
      Promise.all([
        client.invalidateQueries({ queryKey: PREDICTION_RUN_CATALOG_QUERY_KEY(organizationId) }),
        client.invalidateQueries({ queryKey: SCHEMA_REVIEW_INBOX_QUERY_KEY(organizationId) }),
        // Submitting completes the assignment every inference page lists.
        client.invalidateQueries({
          queryKey: INFERENCE_REVIEW_ASSIGNMENTS_ROOT_QUERY_KEY(organizationId),
        }),
      ]),
  });

export const useSubmitSchemaReviewInboxMutation = () =>
  useMutation(submitSchemaReviewInboxMutation(useCurrentOrganizationId() ?? "none"));
