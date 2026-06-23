/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const SCHEMA_REVIEW_CONTEXT_QUERY_KEY = (token: string) =>
  ["schemaReviewContext", { token }] as const;
export const SCHEMA_REVIEW_RUN_QUERY_KEY = (token: string, runToken: string) =>
  ["schemaReviewRun", { token, runToken }] as const;
export const SCHEMA_REVIEW_LINKS_QUERY_KEY = (schemaId: string, versionId: string) =>
  ["schemaReviewLinks", { schemaId, versionId }] as const;
