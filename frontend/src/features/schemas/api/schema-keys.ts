/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { organizationQueryKey } from "@/shared/api/organization-query-key";

// Ids arrive as route strings and as DTO numbers; keys hold strings so both address one entry.

export const SCHEMA_CATALOG_PAGE_SIZE = 24;
export const SCHEMA_CATALOG_PAGE_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "schemaCatalogPages"] as const;
export const SCHEMA_QUERY_KEY = (organizationId: number | string, schemaId: number | string) =>
  [...organizationQueryKey(organizationId), "schema", { schemaId: String(schemaId) }] as const;
export const SCHEMA_VERSIONS_QUERY_KEY = (
  organizationId: number | string,
  schemaId: number | string,
) =>
  [
    ...organizationQueryKey(organizationId),
    "schemaVersions",
    { schemaId: String(schemaId) },
  ] as const;
export const SCHEMA_VERSION_QUERY_KEY = (
  organizationId: number | string,
  versionId: number | string,
) =>
  [
    ...organizationQueryKey(organizationId),
    "schemaVersion",
    { versionId: String(versionId) },
  ] as const;
export const SCHEMA_BOOKMARKS_QUERY_KEY = (
  organizationId: number | string,
  schemaId: number | string,
) =>
  [
    ...organizationQueryKey(organizationId),
    "schemaBookmarks",
    { schemaId: String(schemaId) },
  ] as const;
export const ORGANIZATION_BOOKMARKS_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "organizationBookmarks"] as const;
export const SCHEMA_BOOKMARK_QUERY_KEY = (
  organizationId: number | string,
  bookmarkId: number | string,
) =>
  [
    ...organizationQueryKey(organizationId),
    "schemaBookmark",
    { bookmarkId: String(bookmarkId) },
  ] as const;
export const SCHEMA_BOOKMARK_EXAMPLES_QUERY_KEY = (
  organizationId: number | string,
  bookmarkId: number | string,
) =>
  [
    ...organizationQueryKey(organizationId),
    "schemaBookmarkExamples",
    { bookmarkId: String(bookmarkId) },
  ] as const;
export const SCHEMA_DRAFTS_QUERY_KEY = (
  organizationId: number | string,
  schemaId: number | string,
) =>
  [
    ...organizationQueryKey(organizationId),
    "schemaDrafts",
    { schemaId: String(schemaId) },
  ] as const;
export const SCHEMA_DRAFT_QUERY_KEY = (organizationId: number | string, draftId: number | string) =>
  [...organizationQueryKey(organizationId), "schemaDraft", { draftId: String(draftId) }] as const;
export const SCHEMA_DRAFT_DIFF_QUERY_KEY = (
  organizationId: number | string,
  draftId: number | string,
) =>
  [
    ...organizationQueryKey(organizationId),
    "schemaDraftDiff",
    { draftId: String(draftId) },
  ] as const;
export const PREDICTION_RUN_QUERY_KEY = (organizationId: number | string, runId: number | string) =>
  [...organizationQueryKey(organizationId), "predictionRun", { runId: String(runId) }] as const;
export const PREDICTION_FEEDBACK_QUERY_KEY = (organizationId: number | string) =>
  [...organizationQueryKey(organizationId), "predictionFeedback"] as const;
export const PREDICTION_RESULT_FEEDBACK_QUERY_KEY = (
  organizationId: number | string,
  resultId: number | string,
) =>
  [
    ...PREDICTION_FEEDBACK_QUERY_KEY(organizationId),
    "result",
    { resultId: String(resultId) },
  ] as const;
export const PREDICTION_RUNS_FEEDBACK_QUERY_KEY = (
  organizationId: number | string,
  runIds: readonly string[],
) => [...PREDICTION_FEEDBACK_QUERY_KEY(organizationId), "runs", { runIds }] as const;

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
