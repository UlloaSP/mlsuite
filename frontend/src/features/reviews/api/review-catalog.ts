import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { appFetch } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type {
  ReviewInboxCatalogDto,
  ReviewInboxItemDto,
  ReviewCatalogSummaryDto,
  SchemaReviewRunListItemDto,
} from "@/shared/api/openapi.gen";
import { REVIEW_INBOX_ITEMS_QUERY_KEY, SCHEMA_REVIEW_INBOX_QUERY_KEY } from "./review-keys";
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
const reviewInboxItemQueryKey = (org: number | string, reviewId?: string, runId?: string) =>
  [...REVIEW_INBOX_ITEMS_QUERY_KEY(org), reviewId, runId] as const;

export const reviewInboxItemQueryOptions = (
  org: number | string,
  reviewId?: string,
  runId?: string,
) =>
  queryOptions({
    queryKey: reviewInboxItemQueryKey(org, reviewId, runId),
    // The inbox page owns these failures: a gone run moves it on, any other shows its state.
    meta: { errorHandledLocally: true },
    queryFn: ({ signal }) =>
      appFetch<ReviewInboxItemDto>(`/api/schema-reviews/inbox/${reviewId}/runs/${runId}`, {
        signal,
      }),
    enabled: Boolean(reviewId && runId) && org !== "none",
    retry: false,
  });

/** One inbox item, shown as `listed` (its row in the inbox) until the server's answer arrives. */
export const useReviewInboxItem = (
  reviewId?: string,
  runId?: string,
  listed?: ReviewInboxItemDto,
) =>
  useQuery({
    ...reviewInboxItemQueryOptions(useCurrentOrganizationId() ?? "none", reviewId, runId),
    placeholderData: listed,
  });

export const reviewCatalogContextQueryOptions = (org: number | string, reviewId?: string) =>
  queryOptions({
    queryKey: [...SCHEMA_REVIEW_INBOX_QUERY_KEY(org), "context", reviewId],
    meta: { errorHandledLocally: true },
    queryFn: ({ signal }) =>
      appFetch<ReviewCatalogSummaryDto>(`/api/schema-reviews/inbox/${reviewId}`, { signal }),
    enabled: Boolean(reviewId) && org !== "none",
  });

export const useReviewCatalogContext = (reviewId?: string) =>
  useQuery(reviewCatalogContextQueryOptions(useCurrentOrganizationId() ?? "none", reviewId));

export const reviewFirstRunQueryOptions = (org: number | string, reviewId?: string) =>
  queryOptions({
    queryKey: [...SCHEMA_REVIEW_INBOX_QUERY_KEY(org), "first", reviewId],
    meta: { errorHandledLocally: true },
    queryFn: ({ signal }) =>
      appFetch<CatalogPage<SchemaReviewRunListItemDto>>(
        `/api/schema-reviews/inbox/${reviewId}/runs/catalog?size=1&filter=active`,
        { signal },
      ),
    enabled: Boolean(reviewId) && org !== "none",
  });

export const useReviewFirstRun = (reviewId?: string, enabled = false) => {
  const options = reviewFirstRunQueryOptions(useCurrentOrganizationId() ?? "none", reviewId);
  return useQuery({ ...options, enabled: options.enabled !== false && enabled });
};
