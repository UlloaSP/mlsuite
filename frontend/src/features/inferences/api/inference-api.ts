import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { PREDICTION_RUN_CATALOG_QUERY_KEY } from "@/capabilities/prediction-runs/prediction-run-keys";
import { INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY } from "@/capabilities/review-creation/review-creation-api";
import { appFetch } from "@/shared/api/http";
import type {
  PredictionRunCatalogItemDto,
  SchemaReviewAssignmentStatusDto,
} from "@/shared/api/openapi.gen";

export type InferenceStatus = PredictionRunCatalogItemDto["status"];

/** How often open review views check for reviewers' progress (paused in background tabs). */
export const REVIEW_POLL_MS = 15_000;

export const INFERENCES_QUERY_KEY = PREDICTION_RUN_CATALOG_QUERY_KEY;
export { INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY };

export const inferenceCatalogQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: INFERENCES_QUERY_KEY(organizationId),
    queryFn: ({ signal }) =>
      appFetch<PredictionRunCatalogItemDto[]>("/api/prediction-runs", { signal }),
    enabled: organizationId !== "none",
  });

/** Nested under the catalog key, so every catalog invalidation also refreshes the detail. */
export const inferenceQueryKey = (organizationId: number | string, inferenceId: string) =>
  [...INFERENCES_QUERY_KEY(organizationId), inferenceId] as const;

export const inferenceQueryOptions = (organizationId: number | string, inferenceId: string) =>
  queryOptions({
    queryKey: inferenceQueryKey(organizationId, inferenceId),
    queryFn: ({ signal }) =>
      appFetch<PredictionRunCatalogItemDto>(
        `/api/prediction-runs/${encodeURIComponent(inferenceId)}/summary`,
        { signal },
      ),
    enabled: organizationId !== "none" && Boolean(inferenceId),
  });

export const inferenceReviewAssignmentsQueryOptions = (
  organizationId: number | string,
  inferenceId: number,
) =>
  queryOptions({
    queryKey: INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY(organizationId, inferenceId),
    queryFn: ({ signal }) =>
      appFetch<SchemaReviewAssignmentStatusDto[]>(
        `/api/schema-reviews/inferences/${inferenceId}/assignments`,
        { signal },
      ),
    enabled: organizationId !== "none",
    // Reviewers submit from elsewhere: always refetch on opening, then keep polling.
    staleTime: 0,
    refetchInterval: REVIEW_POLL_MS,
  });

export const useInferenceCatalog = () => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(inferenceCatalogQueryOptions(organizationId));
};

export const useInference = (inferenceId: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(inferenceQueryOptions(organizationId, inferenceId));
};

/** Only review managers may list assignments; others pass `enabled: false`. */
export const useInferenceReviewAssignments = (inferenceId: number, enabled = true) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const options = inferenceReviewAssignmentsQueryOptions(organizationId, inferenceId);
  return useQuery({ ...options, enabled: options.enabled !== false && enabled });
};
