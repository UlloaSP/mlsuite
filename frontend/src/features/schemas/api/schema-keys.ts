/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { organizationQueryKey } from "@/capabilities/workspace-context/organization-query-key";

export const SCHEMAS_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "schemas"] as const;
export const SCHEMA_CATALOG_PAGE_SIZE = 24;
export const SCHEMA_CATALOG_PAGE_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "schemaCatalogPages"] as const;
export const SCHEMA_QUERY_KEY = (organizationId: number | string, schemaId: string) =>
  [...organizationQueryKey(organizationId), "schema", { schemaId }] as const;
export const SCHEMA_VERSIONS_QUERY_KEY = (organizationId: number | string, schemaId: string) =>
  [...organizationQueryKey(organizationId), "schemaVersions", { schemaId }] as const;
export const SCHEMA_VERSION_QUERY_KEY = (organizationId: number | string, versionId: string) =>
  [...organizationQueryKey(organizationId), "schemaVersion", { versionId }] as const;
export const SCHEMA_BOOKMARKS_QUERY_KEY = (organizationId: number | string, schemaId: string) =>
  [...organizationQueryKey(organizationId), "schemaBookmarks", { schemaId }] as const;
export const SCHEMA_BOOKMARK_QUERY_KEY = (organizationId: number | string, bookmarkId: string) =>
  [...organizationQueryKey(organizationId), "schemaBookmark", { bookmarkId }] as const;
export const SCHEMA_DRAFTS_QUERY_KEY = (organizationId: number | string, schemaId: string) =>
  [...organizationQueryKey(organizationId), "schemaDrafts", { schemaId }] as const;
export const SCHEMA_DRAFT_QUERY_KEY = (organizationId: number | string, draftId: string) =>
  [...organizationQueryKey(organizationId), "schemaDraft", { draftId }] as const;
export const SCHEMA_DRAFT_DIFF_QUERY_KEY = (organizationId: number | string, draftId: string) =>
  [...organizationQueryKey(organizationId), "schemaDraftDiff", { draftId }] as const;
export const PREDICTION_RUN_QUERY_KEY = (organizationId: number | string, runId: string) =>
  [...organizationQueryKey(organizationId), "predictionRun", { runId }] as const;
export const BOOKMARK_PREDICTION_RUNS_QUERY_KEY = (
  organizationId: number | string,
  bookmarkId: string | number,
) =>
  [
    ...organizationQueryKey(organizationId),
    "bookmarkPredictionRuns",
    { bookmarkId: String(bookmarkId) },
  ] as const;
export const PREDICTION_RESULT_FEEDBACK_QUERY_KEY = (
  organizationId: number | string,
  resultId: string,
) => [...organizationQueryKey(organizationId), "predictionResultFeedback", { resultId }] as const;

export const schemaCatalogPageQueryKey = (
  organizationId: number | string | undefined,
  page: number,
  search: string,
  sort: string,
  status: string,
) => [
  ...SCHEMA_CATALOG_PAGE_QUERY_KEY(organizationId ?? "none"),
  page,
  SCHEMA_CATALOG_PAGE_SIZE,
  search,
  sort,
  status,
];
