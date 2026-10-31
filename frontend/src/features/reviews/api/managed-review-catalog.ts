import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { PREDICTION_RUN_CATALOG_QUERY_KEY } from "@/capabilities/prediction-runs/prediction-run-keys";
import { REVIEWS_ROOT_QUERY_KEY } from "@/capabilities/review-creation/review-creation-api";
import { appFetch } from "@/shared/api/http";
import { useInfiniteCatalog, type CatalogPage } from "@/shared/api/infinite-catalog";
import type { ManagedReviewDto } from "@/shared/api/openapi.gen";

export function useManagedReviews(search: string, filter: string) {
  const org = useCurrentOrganizationId() ?? "none";
  return useInfiniteCatalog({
    queryKey: [...REVIEWS_ROOT_QUERY_KEY(org), "managed", "infinite", search, filter],
    queryFn: (page, signal) =>
      appFetch<CatalogPage<ManagedReviewDto>>(
        `/api/schema-reviews/managed/catalog?${new URLSearchParams({ page: String(page), size: "24", search, filter })}`,
        { signal },
      ),
    enabled: org !== "none",
  });
}

export const useDeleteReview = () => {
  const queryClient = useQueryClient();
  const org = useCurrentOrganizationId() ?? "none";
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: (reviewId: string) =>
      appFetch<void>(`/api/schema-reviews/${encodeURIComponent(reviewId)}`, { method: "DELETE" }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: REVIEWS_ROOT_QUERY_KEY(org) }),
        queryClient.invalidateQueries({ queryKey: PREDICTION_RUN_CATALOG_QUERY_KEY(org) }),
      ]),
  });
};
