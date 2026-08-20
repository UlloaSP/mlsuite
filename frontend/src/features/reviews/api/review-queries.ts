import { queryOptions, useQuery } from "@tanstack/react-query";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { getSchemaReviewInbox, getSchemaReviewRunDetail } from "./review-api";
import { SCHEMA_REVIEW_INBOX_QUERY_KEY, SCHEMA_REVIEW_RUN_QUERY_KEY } from "./review-keys";

export const schemaReviewInboxQueryOptions = (organizationId: number | string) =>
  queryOptions({
    queryKey: SCHEMA_REVIEW_INBOX_QUERY_KEY(organizationId),
    queryFn: ({ signal }) => getSchemaReviewInbox(signal),
    enabled: organizationId !== "none",
  });

export const schemaReviewRunQueryOptions = (
  organizationId: number | string,
  reviewId: string,
  reviewRunId: string,
) =>
  queryOptions({
    queryKey: SCHEMA_REVIEW_RUN_QUERY_KEY(organizationId, reviewId, reviewRunId),
    queryFn: ({ signal }) => getSchemaReviewRunDetail(reviewId, reviewRunId, signal),
    enabled: organizationId !== "none" && Boolean(reviewId && reviewRunId),
  });

export const useSchemaReviewInbox = () => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaReviewInboxQueryOptions(organizationId));
};

export const useSchemaReviewRun = (reviewId: string, reviewRunId: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaReviewRunQueryOptions(organizationId, reviewId, reviewRunId));
};
