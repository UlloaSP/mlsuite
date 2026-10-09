import { useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { appFetch } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type {
  ReviewAssignmentCountsDto,
  SchemaReviewAssignmentStatusDto,
} from "@/shared/api/openapi.gen";
import { INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY, REVIEW_POLL_MS } from "./inference-api";

export function useReviewAssignmentCatalog(
  id: number,
  controls: { search: string; filter: string; sort: string },
) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useInfiniteCatalog<CatalogPage<SchemaReviewAssignmentStatusDto>>({
    queryKey: [...INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY(organizationId, id), "infinite", controls],
    itemId: (item) => `${item.reviewRunId}:${item.reviewer.id}`,
    queryFn: (page, signal) =>
      appFetch<CatalogPage<SchemaReviewAssignmentStatusDto>>(
        `/api/schema-reviews/inferences/${id}/assignments/catalog?${new URLSearchParams({ page: String(page), size: "24", ...controls })}`,
        { signal },
      ),
    enabled: organizationId !== "none",
    staleTime: 0,
    refetchInterval: REVIEW_POLL_MS,
  });
}

export function useReviewAssignmentCounts(id: number, enabled: boolean) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: [...INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY(organizationId, id), "counts"],
    queryFn: ({ signal }) =>
      appFetch<ReviewAssignmentCountsDto>(
        `/api/schema-reviews/inferences/${id}/assignments/counts`,
        { signal },
      ),
    enabled: organizationId !== "none" && enabled,
    staleTime: 0,
    refetchInterval: REVIEW_POLL_MS,
  });
}

export function useReviewAssignment(id: number, reviewRunId: string, reviewerId: string) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: [
      ...INFERENCE_REVIEW_ASSIGNMENTS_QUERY_KEY(organizationId, id),
      "detail",
      reviewRunId,
      reviewerId,
    ],
    queryFn: ({ signal }) =>
      appFetch<SchemaReviewAssignmentStatusDto>(
        `/api/schema-reviews/inferences/${id}/assignments/${encodeURIComponent(reviewRunId)}/${encodeURIComponent(reviewerId)}`,
        { signal },
      ),
    enabled: organizationId !== "none" && Boolean(reviewRunId && reviewerId),
    staleTime: 0,
    refetchInterval: REVIEW_POLL_MS,
  });
}
