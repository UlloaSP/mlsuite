import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { PREDICTION_RUN_CATALOG_QUERY_KEY } from "@/capabilities/prediction-runs/prediction-run-keys";
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

export const invalidatePredictionRunCollections = (
  queryClient: QueryClient,
  organizationId: number | string,
  bookmarkId: string | number,
) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: BOOKMARK_PREDICTION_RUNS_QUERY_KEY(organizationId, bookmarkId),
    }),
    queryClient.invalidateQueries({
      queryKey: PREDICTION_RUN_CATALOG_QUERY_KEY(organizationId),
    }),
  ]);

export function useCreatePredictionRunForBookmarkMutation(bookmarkId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreatePredictionRunRequest) =>
      createPredictionRunForBookmark(bookmarkId, req),
    onSuccess: (run) => {
      qc.setQueryData(PREDICTION_RUN_QUERY_KEY(organizationId, run.id), run);
      void invalidatePredictionRunCollections(qc, organizationId, bookmarkId);
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
