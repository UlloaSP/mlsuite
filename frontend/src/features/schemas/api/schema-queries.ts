import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import { queryOptions, useQueries, useQuery, type QueryKey } from "@tanstack/react-query";
import { getSchema, getSchemaPage, getSchemaVersion } from "./schema-api";
import { getSchemaBookmark } from "./schema-bookmark-api";
import { getSchemaDraft, getSchemaDraftDiff } from "./schema-draft-api";
import {
  getPredictionResultFeedback,
  getPredictionRunsFeedback,
  getPredictionRun,
} from "./schema-prediction-api";
import {
  PREDICTION_RESULT_FEEDBACK_QUERY_KEY,
  PREDICTION_RUNS_FEEDBACK_QUERY_KEY,
  PREDICTION_RUN_QUERY_KEY,
  SCHEMA_BOOKMARK_QUERY_KEY,
  SCHEMA_CATALOG_PAGE_SIZE,
  SCHEMA_CATALOG_PAGE_QUERY_KEY,
  SCHEMA_DRAFT_DIFF_QUERY_KEY,
  SCHEMA_DRAFT_QUERY_KEY,
  SCHEMA_QUERY_KEY,
  SCHEMA_VERSION_QUERY_KEY,
} from "./schema-keys";
import type { PredictionRunDto } from "@/shared/api/openapi.gen";

type Scope = number | string;

/** Query options and hook for one tenant resource fetched by id; disabled until the id is known. */
function byIdQuery<T>(
  key: (organizationId: Scope, id: number | string) => QueryKey,
  fetcher: (id: number | string, signal: AbortSignal) => Promise<T>,
) {
  const options = (organizationId: Scope, id?: number | string) =>
    queryOptions({
      queryKey: key(organizationId, id ?? ""),
      queryFn: ({ signal }) => fetcher(id ?? "", signal),
      enabled: Boolean(id),
    });
  const useById = (id?: number | string) => {
    const organizationId = useCurrentOrganizationId() ?? "none";
    return useQuery(options(organizationId, id));
  };
  return { options, useById };
}

const schemaQuery = byIdQuery(SCHEMA_QUERY_KEY, getSchema);
const schemaVersionQuery = byIdQuery(SCHEMA_VERSION_QUERY_KEY, getSchemaVersion);
const schemaBookmarkQuery = byIdQuery(SCHEMA_BOOKMARK_QUERY_KEY, getSchemaBookmark);
const schemaDraftQuery = byIdQuery(SCHEMA_DRAFT_QUERY_KEY, getSchemaDraft);
const schemaDraftDiffQuery = byIdQuery(SCHEMA_DRAFT_DIFF_QUERY_KEY, getSchemaDraftDiff);
const predictionRunQuery = byIdQuery(PREDICTION_RUN_QUERY_KEY, getPredictionRun);
const predictionResultFeedbackQuery = byIdQuery(
  PREDICTION_RESULT_FEEDBACK_QUERY_KEY,
  getPredictionResultFeedback,
);

export const schemaVersionQueryOptions = schemaVersionQuery.options;
export const predictionRunQueryOptions = predictionRunQuery.options;
export const predictionResultFeedbackQueryOptions = predictionResultFeedbackQuery.options;

export const useSchema = schemaQuery.useById;
export const useSchemaVersion = schemaVersionQuery.useById;
export const useSchemaBookmark = schemaBookmarkQuery.useById;
export const useSchemaDraft = schemaDraftQuery.useById;
export const useSchemaDraftDiff = schemaDraftDiffQuery.useById;
export const usePredictionRun = predictionRunQuery.useById;

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

export const usePredictionRunFeedback = (run?: PredictionRunDto) => {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const queries = useQueries({
    queries: (run?.results ?? []).map((result) =>
      predictionResultFeedbackQueryOptions(organizationId, result.id),
    ),
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
  });
  return { ...query, data: query.data ?? [] };
};

export const useSchemaCatalogPageQuery = (
  organizationId: number | string | undefined,
  search: string,
  sort: string,
  status: string,
) =>
  useInfiniteCatalog({
    queryKey: [
      ...SCHEMA_CATALOG_PAGE_QUERY_KEY(organizationId ?? "none"),
      "infinite",
      search,
      sort,
      status,
    ],
    queryFn: (page, signal) =>
      getSchemaPage({ page, search, size: SCHEMA_CATALOG_PAGE_SIZE, sort, status }, signal),
    enabled: Boolean(organizationId),
  });
