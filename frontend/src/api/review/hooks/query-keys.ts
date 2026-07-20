/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const SCHEMA_REVIEW_CONTEXT_QUERY_KEY = (token: string) =>
  ["schemaReviewContext", { token }] as const;
export const SCHEMA_REVIEW_RUN_QUERY_KEY = (token: string, runToken: string) =>
  ["schemaReviewRun", { token, runToken }] as const;
export const SCHEMA_REVIEW_LINKS_QUERY_KEY = (
  organizationId: number | string,
  schemaId: string,
  versionId: string,
) =>
  [...organizationQueryKey(organizationId), "schemaReviewLinks", { schemaId, versionId }] as const;
import { organizationQueryKey } from "@/api/workspace/hooks/query-keys";
