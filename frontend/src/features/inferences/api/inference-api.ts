import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { PREDICTION_RUN_CATALOG_QUERY_KEY } from "@/capabilities/prediction-runs/prediction-run-keys";
import { INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY } from "@/capabilities/review-creation/review-creation-api";
import { appFetch } from "@/shared/api/http";

export type InferenceStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";

export type InferenceCatalogItemDto = {
  id: number;
  name: string;
  status: InferenceStatus;
  createdAt: string;
  updatedAt?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
  schemaId: number;
  schemaName: string;
  schemaVersionId: number;
  schemaVersion: number;
  schemaVersionName: string;
  bookmarkId?: number | null;
  bookmarkName?: string | null;
};

export type InferenceReviewAssignmentDto = {
  reviewId: string;
  reviewRunId: string;
  reviewer: {
    id: number;
    fullName: string;
    email: string;
  };
  createdBy: {
    id: number;
    fullName: string;
    email: string;
  };
  reviewState: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  submittedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  expired: boolean;
};

export const INFERENCES_QUERY_KEY = PREDICTION_RUN_CATALOG_QUERY_KEY;
export { INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY };

export const inferenceCatalogQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: INFERENCES_QUERY_KEY(organizationId),
    queryFn: ({ signal }) =>
      appFetch<InferenceCatalogItemDto[]>("/api/prediction-runs", { signal }),
    enabled: organizationId !== "none",
  });

/** Nested under the catalog key, so every catalog invalidation also refreshes the detail. */
export const inferenceQueryKey = (organizationId: number | string, inferenceId: string) =>
  [...INFERENCES_QUERY_KEY(organizationId), inferenceId] as const;

export const inferenceQueryOptions = (organizationId: number | string, inferenceId: string) =>
  queryOptions({
    queryKey: inferenceQueryKey(organizationId, inferenceId),
    queryFn: ({ signal }) =>
      appFetch<InferenceCatalogItemDto>(
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
      appFetch<InferenceReviewAssignmentDto[]>(
        `/api/schema-reviews/inferences/${inferenceId}/assignments`,
        { signal },
      ),
    enabled: organizationId !== "none",
  });

export const useInferenceCatalog = () => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(inferenceCatalogQueryOptions(organizationId));
};

export const useInference = (inferenceId: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(inferenceQueryOptions(organizationId, inferenceId));
};

export const useInferenceReviewAssignments = (inferenceId: number) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(inferenceReviewAssignmentsQueryOptions(organizationId, inferenceId));
};
