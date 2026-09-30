import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { PREDICTION_RUN_CATALOG_QUERY_KEY } from "@/capabilities/prediction-runs/prediction-run-keys";
import { createPredictionRunForBookmark } from "./schema-prediction-api";
import { ORGANIZATION_BOOKMARKS_QUERY_KEY, PREDICTION_RUN_QUERY_KEY } from "./schema-keys";
import type { CreatePredictionRunRequest } from "@/shared/api/openapi.gen";

export const invalidatePredictionRunCollections = (
  queryClient: QueryClient,
  organizationId: number | string,
) =>
  Promise.all([
    queryClient.invalidateQueries({
      queryKey: PREDICTION_RUN_CATALOG_QUERY_KEY(organizationId),
    }),
    // The Predict launcher shows each bookmark's run count and last run.
    queryClient.invalidateQueries({ queryKey: ORGANIZATION_BOOKMARKS_QUERY_KEY(organizationId) }),
  ]);

export function useCreatePredictionRunForBookmarkMutation(bookmarkId: number | string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (req: CreatePredictionRunRequest) =>
      createPredictionRunForBookmark(bookmarkId, req),
    onSuccess: (run) => {
      qc.setQueryData(PREDICTION_RUN_QUERY_KEY(organizationId, run.id), run);
      void invalidatePredictionRunCollections(qc, organizationId);
    },
  });
}
