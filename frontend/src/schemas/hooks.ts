/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import * as schemaApi from "./api/schemaService";
import type {
  CreatePredictionResultFeedbackRequest,
  CreatePredictionRunRequest,
  CreateSchemaVersionRequest,
  UpdatePredictionResultFeedbackRequest,
  PredictionRunDto,
} from "./types";

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

export const useSchemas = () =>
  useQuery({ queryKey: SCHEMAS_QUERY_KEY, queryFn: schemaApi.getSchemas });

export const useSchema = (schemaId?: string) =>
  useQuery({
    queryKey: SCHEMA_QUERY_KEY(schemaId ?? ""),
    queryFn: () => schemaApi.getSchema(schemaId ?? ""),
    enabled: Boolean(schemaId),
  });

export const useSchemaVersions = (schemaId?: string) =>
  useQuery({
    queryKey: SCHEMA_VERSIONS_QUERY_KEY(schemaId ?? ""),
    queryFn: () => schemaApi.getSchemaVersions(schemaId ?? ""),
    enabled: Boolean(schemaId),
    placeholderData: [],
  });

export const useSchemaVersion = (versionId?: string) =>
  useQuery({
    queryKey: SCHEMA_VERSION_QUERY_KEY(versionId ?? ""),
    queryFn: () => schemaApi.getSchemaVersion(versionId ?? ""),
    enabled: Boolean(versionId),
  });

export const usePredictionRun = (runId?: string) =>
  useQuery({
    queryKey: PREDICTION_RUN_QUERY_KEY(runId ?? ""),
    queryFn: () => schemaApi.getPredictionRun(runId ?? ""),
    enabled: Boolean(runId),
  });

export const usePredictionRuns = (versionId?: string) =>
  useQuery({
    queryKey: PREDICTION_RUNS_QUERY_KEY(versionId ?? ""),
    queryFn: () => schemaApi.getPredictionRuns(versionId ?? ""),
    enabled: Boolean(versionId),
    placeholderData: [],
  });

export function useCreateSchemaMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: schemaApi.createSchema,
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMAS_QUERY_KEY }),
  });
}

export function useCreateSchemaVersionMutation(schemaId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSchemaVersionRequest) => schemaApi.createSchemaVersion(schemaId, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: SCHEMA_VERSIONS_QUERY_KEY(schemaId) }),
  });
}

export function useCreatePredictionRunMutation(versionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreatePredictionRunRequest) => schemaApi.createPredictionRun(versionId, req),
    onSuccess: (run) => {
      qc.setQueryData(PREDICTION_RUN_QUERY_KEY(run.id), run);
      qc.invalidateQueries({ queryKey: PREDICTION_RUNS_QUERY_KEY(versionId) });
    },
  });
}

export const usePredictionResultFeedback = (resultId?: string) =>
  useQuery({
    queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(resultId ?? ""),
    queryFn: () => schemaApi.getPredictionResultFeedback(resultId ?? ""),
    enabled: Boolean(resultId),
    placeholderData: [],
  });

export const usePredictionRunFeedback = (run?: PredictionRunDto) => {
  const queries = useQueries({
    queries: (run?.results ?? []).map((result) => ({
      queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(result.id),
      queryFn: () => schemaApi.getPredictionResultFeedback(result.id),
      enabled: Boolean(run),
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
  const resultIds = runs.flatMap((run) => run.results.map((result) => result.id));
  const queries = useQueries({
    queries: resultIds.map((resultId) => ({
      queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(resultId),
      queryFn: () => schemaApi.getPredictionResultFeedback(resultId),
      placeholderData: [],
    })),
  });
  return {
    data: queries.flatMap((query) => query.data ?? []),
    isLoading: queries.some((query) => query.isLoading),
  };
};

export function useCreatePredictionResultFeedbackMutation(resultId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreatePredictionResultFeedbackRequest) =>
      schemaApi.createPredictionResultFeedback(req),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(resultId) }),
  });
}

export function useUpdatePredictionResultFeedbackMutation(resultId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: UpdatePredictionResultFeedbackRequest) =>
      schemaApi.updatePredictionResultFeedback(req),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: PREDICTION_RESULT_FEEDBACK_QUERY_KEY(resultId) }),
  });
}
