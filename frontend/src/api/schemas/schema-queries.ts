import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import * as api from "./services";
import {
  BOOKMARK_PREDICTION_RUNS_QUERY_KEY,
  PREDICTION_RESULT_FEEDBACK_QUERY_KEY,
  PREDICTION_RUN_QUERY_KEY,
  SCHEMAS_QUERY_KEY,
  SCHEMA_BOOKMARKS_QUERY_KEY,
  SCHEMA_BOOKMARK_QUERY_KEY,
  SCHEMA_CATALOG_PAGE_SIZE,
  SCHEMA_DRAFTS_QUERY_KEY,
  SCHEMA_DRAFT_DIFF_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_QUERY_KEY,
  SCHEMA_VERSIONS_QUERY_KEY,
  SCHEMA_VERSION_QUERY_KEY,
  schemaCatalogPageQueryKey,
} from "./hooks/query-keys";

type Scope = number | string;

export const schemasQueryOptions = (organizationId: Scope) =>
  queryOptions({
    queryKey: SCHEMAS_QUERY_KEY(organizationId),
    queryFn: ({ signal }) => api.getSchemas(signal),
  });

export const schemaCatalogPageQueryOptions = (
  organizationId: Scope | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) =>
  queryOptions({
    queryKey: schemaCatalogPageQueryKey(organizationId, page, search, sort, status),
    queryFn: ({ signal }) =>
      api.getSchemaPage({ page, search, size: SCHEMA_CATALOG_PAGE_SIZE, sort, status }, signal),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });

export const schemaQueryOptions = (organizationId: Scope, schemaId?: string) =>
  queryOptions({
    queryKey: SCHEMA_QUERY_KEY(organizationId, schemaId ?? ""),
    queryFn: ({ signal }) => api.getSchema(schemaId ?? "", signal),
    enabled: Boolean(schemaId),
  });

export const schemaVersionsQueryOptions = (organizationId: Scope, schemaId?: string) =>
  queryOptions({
    queryKey: SCHEMA_VERSIONS_QUERY_KEY(organizationId, schemaId ?? ""),
    queryFn: ({ signal }) => api.getSchemaVersions(schemaId ?? "", signal),
    enabled: Boolean(schemaId),
  });

export const schemaVersionQueryOptions = (organizationId: Scope, versionId?: string) =>
  queryOptions({
    queryKey: SCHEMA_VERSION_QUERY_KEY(organizationId, versionId ?? ""),
    queryFn: ({ signal }) => api.getSchemaVersion(versionId ?? "", signal),
    enabled: Boolean(versionId),
  });

export const schemaBookmarksQueryOptions = (organizationId: Scope, schemaId?: string) =>
  queryOptions({
    queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, schemaId ?? ""),
    queryFn: ({ signal }) => api.getSchemaBookmarks(schemaId ?? "", signal),
    enabled: Boolean(schemaId),
  });

export const schemaBookmarkQueryOptions = (organizationId: Scope, bookmarkId?: string) =>
  queryOptions({
    queryKey: SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmarkId ?? ""),
    queryFn: ({ signal }) => api.getSchemaBookmark(bookmarkId ?? "", signal),
    enabled: Boolean(bookmarkId),
  });

export const schemaDraftsQueryOptions = (organizationId: Scope, schemaId?: string) =>
  queryOptions({
    queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId ?? ""),
    queryFn: ({ signal }) => api.getSchemaDrafts(schemaId ?? "", signal),
    enabled: Boolean(schemaId),
  });

export const schemaDraftQueryOptions = (organizationId: Scope, draftId?: string) =>
  queryOptions({
    queryKey: SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId ?? ""),
    queryFn: ({ signal }) => api.getSchemaDraft(draftId ?? "", signal),
    enabled: Boolean(draftId),
  });

export const schemaDraftDiffQueryOptions = (organizationId: Scope, draftId?: string) =>
  queryOptions({
    queryKey: SCHEMA_DRAFT_DIFF_QUERY_KEY(organizationId, draftId ?? ""),
    queryFn: ({ signal }) => api.getSchemaDraftDiff(draftId ?? "", signal),
    enabled: Boolean(draftId),
  });

export const predictionRunQueryOptions = (organizationId: Scope, runId?: string) =>
  queryOptions({
    queryKey: PREDICTION_RUN_QUERY_KEY(organizationId, runId ?? ""),
    queryFn: ({ signal }) => api.getPredictionRun(runId ?? "", signal),
    enabled: Boolean(runId),
  });

export const bookmarkPredictionRunsQueryOptions = (organizationId: Scope, bookmarkId?: string) =>
  queryOptions({
    queryKey: BOOKMARK_PREDICTION_RUNS_QUERY_KEY(organizationId, bookmarkId ?? ""),
    queryFn: ({ signal }) => api.getPredictionRunsForBookmark(bookmarkId ?? "", signal),
    enabled: Boolean(bookmarkId),
  });

export const predictionResultFeedbackQueryOptions = (organizationId: Scope, resultId?: string) =>
  queryOptions({
    queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(organizationId, resultId ?? ""),
    queryFn: ({ signal }) => api.getPredictionResultFeedback(resultId ?? "", signal),
    enabled: Boolean(resultId),
  });
