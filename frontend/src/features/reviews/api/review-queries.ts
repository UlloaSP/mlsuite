import { queryOptions, useQuery } from "@tanstack/react-query";
import { getSchemaReviewContext, getSchemaReviewRunDetail } from "./review-api";
import { SCHEMA_REVIEW_CONTEXT_QUERY_KEY, SCHEMA_REVIEW_RUN_QUERY_KEY } from "./review-keys";

export const schemaReviewContextQueryOptions = (token: string) =>
  queryOptions({
    queryKey: SCHEMA_REVIEW_CONTEXT_QUERY_KEY(token),
    queryFn: ({ signal }) => getSchemaReviewContext(token, signal),
    enabled: Boolean(token),
  });

export const schemaReviewRunQueryOptions = (token: string, runToken: string) =>
  queryOptions({
    queryKey: SCHEMA_REVIEW_RUN_QUERY_KEY(token, runToken),
    queryFn: ({ signal }) => getSchemaReviewRunDetail(token, runToken, signal),
    enabled: Boolean(token && runToken),
  });

export const useSchemaReviewContext = (token: string) =>
  useQuery(schemaReviewContextQueryOptions(token));

export const useSchemaReviewRun = (token: string, runToken: string) =>
  useQuery(schemaReviewRunQueryOptions(token, runToken));
