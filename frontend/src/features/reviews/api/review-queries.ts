import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { getSchemaReviewRunDetail } from "./review-api";
import { SCHEMA_REVIEW_RUN_QUERY_KEY } from "./review-keys";

export const schemaReviewRunQueryOptions = (
  organizationId: number | string,
  reviewId: string,
  reviewRunId: string,
) =>
  queryOptions({
    queryKey: SCHEMA_REVIEW_RUN_QUERY_KEY(organizationId, reviewId, reviewRunId),
    // The review panel says when a run cannot be opened; no toast repeats it.
    meta: { errorHandledLocally: true },
    queryFn: ({ signal }) => getSchemaReviewRunDetail(reviewId, reviewRunId, signal),
    enabled: organizationId !== "none" && Boolean(reviewId && reviewRunId),
    // Switching inferences keeps the previous one on screen, drawn as a skeleton, until this arrives.
    placeholderData: keepPreviousData,
  });

export const useSchemaReviewRun = (reviewId: string, reviewRunId: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaReviewRunQueryOptions(organizationId, reviewId, reviewRunId));
};
