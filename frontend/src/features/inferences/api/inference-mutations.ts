import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY,
  REVIEWS_ROOT_QUERY_KEY,
} from "@/capabilities/review-creation/review-creation-api";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { appFetch, json } from "@/shared/api/http";
import type {
  DeletedPredictionRunsDto,
  DeletePredictionRunsRequest,
} from "@/shared/api/openapi.gen";
import { INFERENCES_QUERY_KEY } from "./inference-api";

const deleteInference = (id: number) =>
  appFetch<void>(`/api/prediction-runs/${id}`, { method: "DELETE" });

export const useDeleteInferenceMutation = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    mutationFn: deleteInference,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: INFERENCES_QUERY_KEY(organizationId) }),
  });
};

/** How many runs one request deletes; the API refuses more. */
const DELETE_SLICE = 500;

const deleteInferences = async (ids: number[]) => {
  for (let start = 0; start < ids.length; start += DELETE_SLICE) {
    await appFetch<DeletedPredictionRunsDto>(
      "/api/prediction-runs/batch-delete",
      json("POST", {
        runIds: ids.slice(start, start + DELETE_SLICE),
      } satisfies DeletePredictionRunsRequest),
    );
  }
};

/** A selection goes a slice at a time; what a failed slice left is still listed, to delete again. */
export const useDeleteInferencesMutation = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    mutationFn: deleteInferences,
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: INFERENCES_QUERY_KEY(organizationId) }),
        queryClient.invalidateQueries({ queryKey: REVIEWS_ROOT_QUERY_KEY(organizationId) }),
      ]),
  });
};

export type ReopenInferenceReviewAssignment = {
  inferenceId: number;
  reviewId: string;
  reviewRunId: string;
  reviewerId: number;
};

const reopenInferenceReviewAssignment = ({
  reviewId,
  reviewRunId,
  reviewerId,
}: ReopenInferenceReviewAssignment) =>
  appFetch<void>(
    `/api/schema-reviews/${encodeURIComponent(reviewId)}/runs/${encodeURIComponent(reviewRunId)}/reviewers/${reviewerId}/reopen`,
    { method: "POST" },
  );

const deleteInferenceReviewResponse = ({
  reviewId,
  reviewRunId,
  reviewerId,
}: ReopenInferenceReviewAssignment) =>
  appFetch<void>(
    `/api/schema-reviews/${encodeURIComponent(reviewId)}/runs/${encodeURIComponent(reviewRunId)}/reviewers/${reviewerId}/response`,
    { method: "DELETE" },
  );

export const useReopenInferenceReviewMutation = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: reopenInferenceReviewAssignment,
    onSuccess: (_data, assignment) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: REVIEWS_ROOT_QUERY_KEY(organizationId) }),
        queryClient.invalidateQueries({
          queryKey: INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY(organizationId, assignment.inferenceId),
        }),
      ]),
  });
};

export const useDeleteInferenceReviewResponseMutation = () => {
  const queryClient = useQueryClient();
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: deleteInferenceReviewResponse,
    onSuccess: (_data, assignment) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: INFERENCES_QUERY_KEY(organizationId) }),
        queryClient.invalidateQueries({ queryKey: REVIEWS_ROOT_QUERY_KEY(organizationId) }),
        queryClient.invalidateQueries({
          queryKey: INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY(organizationId, assignment.inferenceId),
        }),
      ]),
  });
};
