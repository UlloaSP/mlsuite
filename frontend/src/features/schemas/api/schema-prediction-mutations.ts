import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { type QueryClient, useMutation, useQueryClient } from "@tanstack/react-query";
import { PREDICTION_RUN_CATALOG_QUERY_KEY } from "@/capabilities/prediction-runs/prediction-run-keys";
import {
  createPredictionRunForBookmark,
  createPredictionRunsForBookmark,
} from "./schema-prediction-api";
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

/** The most runs one save request carries (CreatePredictionRunsRequest's bound on the server). */
const RUNS_PER_SAVE = 100;

type SaveRuns = {
  runs: readonly CreatePredictionRunRequest[];
  /** Told after each request with the ids of the runs from `from` on that it saved. */
  onSaved: (from: number, runIds: number[]) => void;
};

/**
 * Saves many runs of the bookmark in order, a request per hundred, and refreshes the catalogs
 * once when it ends, however far it got: a failed request leaves the runs before it saved.
 */
export function useCreatePredictionRunsForBookmarkMutation(bookmarkId: number | string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const qc = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: async ({ runs, onSaved }: SaveRuns) => {
      for (let from = 0; from < runs.length; from += RUNS_PER_SAVE) {
        // react-doctor-disable-next-line react-doctor/async-await-in-loop -- Requests stay in order, so history keeps the order the runs happened in.
        const { runIds } = await createPredictionRunsForBookmark(bookmarkId, {
          runs: runs.slice(from, from + RUNS_PER_SAVE),
        });
        onSaved(from, runIds);
      }
    },
    onSettled: () => void invalidatePredictionRunCollections(qc, organizationId),
  });
}

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
