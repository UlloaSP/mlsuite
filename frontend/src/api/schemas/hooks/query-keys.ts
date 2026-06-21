/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export const SCHEMAS_QUERY_KEY = ["schemas"] as const;
export const SCHEMA_QUERY_KEY = (schemaId: string) => ["schema", { schemaId }] as const;
export const SCHEMA_VERSIONS_QUERY_KEY = (schemaId: string) =>
  ["schemaVersions", { schemaId }] as const;
export const SCHEMA_VERSION_QUERY_KEY = (versionId: string) =>
  ["schemaVersion", { versionId }] as const;
export const PREDICTION_RUN_QUERY_KEY = (runId: string) => ["predictionRun", { runId }] as const;
export const PREDICTION_RUNS_QUERY_KEY = (versionId: string | number) =>
  ["predictionRuns", { versionId: String(versionId) }] as const;
export const PREDICTION_RESULT_FEEDBACK_QUERY_KEY = (resultId: string) =>
  ["predictionResultFeedback", { resultId }] as const;
