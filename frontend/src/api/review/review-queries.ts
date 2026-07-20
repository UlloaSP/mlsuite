import { queryOptions } from "@tanstack/react-query";
import {
  getSchemaReviewContext,
  getSchemaReviewRunDetail,
  listSchemaReviewLinks,
} from "./services";
import {
  SCHEMA_REVIEW_CONTEXT_QUERY_KEY,
  SCHEMA_REVIEW_LINKS_QUERY_KEY,
  SCHEMA_REVIEW_RUN_QUERY_KEY,
} from "./hooks/query-keys";

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

export const schemaReviewLinksQueryOptions = (
  organizationId: number | string,
  schemaId: string,
  versionId: string,
) =>
  queryOptions({
    queryKey: SCHEMA_REVIEW_LINKS_QUERY_KEY(organizationId, schemaId, versionId),
    queryFn: ({ signal }) => listSchemaReviewLinks(schemaId, versionId, signal),
    enabled: Boolean(organizationId && schemaId && versionId),
  });
