import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPredictionResultFeedback,
  createPredictionRunForBookmark,
  updatePredictionResultFeedback,
} from "./schema-prediction-api";
import type {
  CreatePredictionResultFeedbackRequest,
  CreatePredictionRunRequest,
  UpdatePredictionResultFeedbackRequest,
} from "./prediction-types";
import {
  BOOKMARK_PREDICTION_RUNS_QUERY_KEY,
  PREDICTION_FEEDBACK_QUERY_KEY,
  PREDICTION_RUN_QUERY_KEY,
} from "./schema-keys";

export function useCreatePredictionRunForBookmarkMutation(bookmarkId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreatePredictionRunRequest) =>
      createPredictionRunForBookmark(bookmarkId, req),
    onSuccess: (run) => {
      qc.setQueryData(PREDICTION_RUN_QUERY_KEY(organizationId, run.id), run);
      void qc.invalidateQueries({
        queryKey: BOOKMARK_PREDICTION_RUNS_QUERY_KEY(organizationId, bookmarkId),
      });
    },
  });
}

export function useCreatePredictionResultFeedbackMutation() {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreatePredictionResultFeedbackRequest) => createPredictionResultFeedback(req),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: PREDICTION_FEEDBACK_QUERY_KEY(organizationId),
      }),
  });
}

export function useUpdatePredictionResultFeedbackMutation() {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdatePredictionResultFeedbackRequest) => updatePredictionResultFeedback(req),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: PREDICTION_FEEDBACK_QUERY_KEY(organizationId),
      }),
  });
}
