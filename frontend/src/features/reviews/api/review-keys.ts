import { organizationQueryKey } from "@/shared/api/organization-query-key";

export const SCHEMA_REVIEWS_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "schemaReviews"] as const;
export const SCHEMA_REVIEW_INBOX_QUERY_KEY = (organizationId: number | string) =>
  [...SCHEMA_REVIEWS_QUERY_KEY(organizationId), "inbox"] as const;
export const SCHEMA_REVIEW_RUN_QUERY_KEY = (
  organizationId: number | string,
  reviewId: string,
  reviewRunId: string,
) => [...SCHEMA_REVIEWS_QUERY_KEY(organizationId), "run", reviewId, reviewRunId] as const;
