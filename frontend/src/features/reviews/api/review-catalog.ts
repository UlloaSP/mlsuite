import { useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { appFetch } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type {
  ReviewInboxCatalogDto,
  ReviewInboxItemDto,
  ReviewCatalogSummaryDto,
  SchemaReviewRunListItemDto,
} from "@/shared/api/openapi.gen";
import { SCHEMA_REVIEW_INBOX_QUERY_KEY } from "./review-keys";
export function useReviewInboxCatalog(filter = "all", enabled = true) {
  const org = useCurrentOrganizationId() ?? "none";
  return useInfiniteCatalog({
    queryKey: [...SCHEMA_REVIEW_INBOX_QUERY_KEY(org), "infinite", filter],
    queryFn: (page, signal) =>
      appFetch<ReviewInboxCatalogDto>(
        `/api/schema-reviews/inbox/runs/catalog?${new URLSearchParams({ page: String(page), size: "24", filter })}`,
        { signal },
      ),
    itemId: (item) => item.publicId,
    enabled: org !== "none" && enabled,
  });
}
export const reviewInboxItemQueryKey = (org: number | string, reviewId?: string, runId?: string) =>
  [...SCHEMA_REVIEW_INBOX_QUERY_KEY(org), "item", reviewId, runId] as const;

export function useReviewInboxItem(reviewId?: string, runId?: string) {
  const org = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: reviewInboxItemQueryKey(org, reviewId, runId),
    queryFn: ({ signal }) =>
      appFetch<ReviewInboxItemDto>(`/api/schema-reviews/inbox/${reviewId}/runs/${runId}`, {
        signal,
      }),
    enabled: Boolean(reviewId && runId) && org !== "none",
    retry: false,
  });
}
export function useReviewCatalogContext(reviewId?: string) {
  const org = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: [...SCHEMA_REVIEW_INBOX_QUERY_KEY(org), "context", reviewId],
    queryFn: ({ signal }) =>
      appFetch<ReviewCatalogSummaryDto>(`/api/schema-reviews/inbox/${reviewId}`, { signal }),
    enabled: Boolean(reviewId) && org !== "none",
  });
}
export function useReviewFirstRun(reviewId?: string, enabled = false) {
  const org = useCurrentOrganizationId() ?? "none";
  return useQuery({
    queryKey: [...SCHEMA_REVIEW_INBOX_QUERY_KEY(org), "first", reviewId],
    queryFn: ({ signal }) =>
      appFetch<CatalogPage<SchemaReviewRunListItemDto>>(
        `/api/schema-reviews/inbox/${reviewId}/runs/catalog?size=1&filter=active`,
        { signal },
      ),
    enabled: Boolean(reviewId) && org !== "none" && enabled,
  });
}
