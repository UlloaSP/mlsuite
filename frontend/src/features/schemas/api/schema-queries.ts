import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { keepPreviousData, queryOptions, useQueries, useQuery } from "@tanstack/react-query";
import { getSchema, getSchemaPage, getSchemaVersion, getSchemaVersions } from "./schema-api";
import { getSchemaBookmark, getSchemaBookmarks } from "./schema-bookmark-api";
import { getSchemaDraft, getSchemaDraftDiff, getSchemaDrafts } from "./schema-draft-api";
import {
  getPredictionResultFeedback,
  getPredictionRunsFeedback,
  getPredictionRun,
  getPredictionRunsForBookmark,
} from "./schema-prediction-api";
import type { PredictionRunDto } from "./prediction-types";
import {
  BOOKMARK_PREDICTION_RUNS_QUERY_KEY,
  PREDICTION_RESULT_FEEDBACK_QUERY_KEY,
  PREDICTION_RUNS_FEEDBACK_QUERY_KEY,
  PREDICTION_RUN_QUERY_KEY,
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
} from "./schema-keys";

type Scope = number | string;

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
      getSchemaPage({ page, search, size: SCHEMA_CATALOG_PAGE_SIZE, sort, status }, signal),
    enabled: Boolean(organizationId),
    placeholderData: keepPreviousData,
  });

export const schemaQueryOptions = (organizationId: Scope, schemaId?: string) =>
  queryOptions({
    queryKey: SCHEMA_QUERY_KEY(organizationId, schemaId ?? ""),
    queryFn: ({ signal }) => getSchema(schemaId ?? "", signal),
    enabled: Boolean(schemaId),
  });

export const schemaVersionsQueryOptions = (organizationId: Scope, schemaId?: string) =>
  queryOptions({
    queryKey: SCHEMA_VERSIONS_QUERY_KEY(organizationId, schemaId ?? ""),
    queryFn: ({ signal }) => getSchemaVersions(schemaId ?? "", signal),
    enabled: Boolean(schemaId),
  });

export const schemaVersionQueryOptions = (organizationId: Scope, versionId?: string) =>
  queryOptions({
    queryKey: SCHEMA_VERSION_QUERY_KEY(organizationId, versionId ?? ""),
    queryFn: ({ signal }) => getSchemaVersion(versionId ?? "", signal),
    enabled: Boolean(versionId),
  });

export const schemaBookmarksQueryOptions = (organizationId: Scope, schemaId?: string) =>
  queryOptions({
    queryKey: SCHEMA_BOOKMARKS_QUERY_KEY(organizationId, schemaId ?? ""),
    queryFn: ({ signal }) => getSchemaBookmarks(schemaId ?? "", signal),
    enabled: Boolean(schemaId),
  });

export const schemaBookmarkQueryOptions = (organizationId: Scope, bookmarkId?: string) =>
  queryOptions({
    queryKey: SCHEMA_BOOKMARK_QUERY_KEY(organizationId, bookmarkId ?? ""),
    queryFn: ({ signal }) => getSchemaBookmark(bookmarkId ?? "", signal),
    enabled: Boolean(bookmarkId),
  });

export const schemaDraftsQueryOptions = (organizationId: Scope, schemaId?: string) =>
  queryOptions({
    queryKey: SCHEMA_DRAFTS_QUERY_KEY(organizationId, schemaId ?? ""),
    queryFn: ({ signal }) => getSchemaDrafts(schemaId ?? "", signal),
    enabled: Boolean(schemaId),
  });

export const schemaDraftQueryOptions = (organizationId: Scope, draftId?: string) =>
  queryOptions({
    queryKey: SCHEMA_DRAFT_QUERY_KEY(organizationId, draftId ?? ""),
    queryFn: ({ signal }) => getSchemaDraft(draftId ?? "", signal),
    enabled: Boolean(draftId),
  });

export const schemaDraftDiffQueryOptions = (organizationId: Scope, draftId?: string) =>
  queryOptions({
    queryKey: SCHEMA_DRAFT_DIFF_QUERY_KEY(organizationId, draftId ?? ""),
    queryFn: ({ signal }) => getSchemaDraftDiff(draftId ?? "", signal),
    enabled: Boolean(draftId),
  });

export const predictionRunQueryOptions = (organizationId: Scope, runId?: string) =>
  queryOptions({
    queryKey: PREDICTION_RUN_QUERY_KEY(organizationId, runId ?? ""),
    queryFn: ({ signal }) => getPredictionRun(runId ?? "", signal),
    enabled: Boolean(runId),
  });

export const bookmarkPredictionRunsQueryOptions = (organizationId: Scope, bookmarkId?: string) =>
  queryOptions({
    queryKey: BOOKMARK_PREDICTION_RUNS_QUERY_KEY(organizationId, bookmarkId ?? ""),
    queryFn: ({ signal }) => getPredictionRunsForBookmark(bookmarkId ?? "", signal),
    enabled: Boolean(bookmarkId),
  });

export const predictionResultFeedbackQueryOptions = (organizationId: Scope, resultId?: string) =>
  queryOptions({
    queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(organizationId, resultId ?? ""),
    queryFn: ({ signal }) => getPredictionResultFeedback(resultId ?? "", signal),
    enabled: Boolean(resultId),
  });

export const predictionRunsFeedbackQueryOptions = (
  organizationId: Scope,
  runIds: readonly (number | string)[],
) => {
  const normalizedRunIds = [...new Set(runIds.map(String))].sort((left, right) =>
    left.localeCompare(right),
  );
  return queryOptions({
    queryKey: PREDICTION_RUNS_FEEDBACK_QUERY_KEY(organizationId, normalizedRunIds),
    queryFn: ({ signal }) => getPredictionRunsFeedback(normalizedRunIds, signal),
    enabled: normalizedRunIds.length > 0,
  });
};

export const useSchema = (schemaId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaQueryOptions(organizationId, schemaId));
};

export const useSchemaVersions = (schemaId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...schemaVersionsQueryOptions(organizationId, schemaId),
    placeholderData: [],
  });
};

export const useSchemaVersion = (versionId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaVersionQueryOptions(organizationId, versionId));
};

export const useSchemaBookmarks = (schemaId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...schemaBookmarksQueryOptions(organizationId, schemaId),
    placeholderData: [],
  });
};

export const useSchemaBookmark = (bookmarkId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaBookmarkQueryOptions(organizationId, bookmarkId));
};

export const useSchemaDrafts = (schemaId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaDraftsQueryOptions(organizationId, schemaId));
};

export const useSchemaDraft = (draftId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaDraftQueryOptions(organizationId, draftId));
};

export const useSchemaDraftDiff = (draftId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(schemaDraftDiffQueryOptions(organizationId, draftId));
};

export const usePredictionRun = (runId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery(predictionRunQueryOptions(organizationId, runId));
};

export const usePredictionRunsForBookmark = (bookmarkId?: string) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  return useQuery({
    ...bookmarkPredictionRunsQueryOptions(organizationId, bookmarkId),
    placeholderData: [],
  });
};

export const usePredictionRunFeedback = (run?: PredictionRunDto) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const queries = useQueries({
    queries: (run?.results ?? []).map((result) => ({
      ...predictionResultFeedbackQueryOptions(organizationId, result.id),
      placeholderData: [],
    })),
  });
  return {
    data: queries.flatMap((query) => query.data ?? []),
    isLoading: queries.some((query) => query.isLoading),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
};

export const usePredictionRunsFeedback = (runs: readonly PredictionRunDto[]) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const query = useQuery({
    ...predictionRunsFeedbackQueryOptions(
      organizationId,
      runs.map((run) => run.id),
    ),
    placeholderData: [],
  });
  return { ...query, data: query.data ?? [] };
};

export const useSchemaCatalogPageQuery = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => {
  return useQuery(schemaCatalogPageQueryOptions(organizationId, page, search, sort, status));
};
