/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../app/api/appFetch";
import type {
  CreatePredictionRunRequest,
  CreatePredictionResultFeedbackRequest,
  CreateSchemaRequest,
  CreateSchemaVersionRequest,
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaDto,
  SchemaVersionDto,
  UpdatePredictionResultFeedbackRequest,
} from "../types";

const json = (method: "POST" | "PATCH", body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const createSchema = (req: CreateSchemaRequest): Promise<SchemaDto> =>
  appFetch<SchemaDto>("/api/schemas", json("POST", req));

export const getSchemas = (): Promise<SchemaDto[]> => appFetch<SchemaDto[]>("/api/schemas");

export const getSchema = (schemaId: string): Promise<SchemaDto> =>
  appFetch<SchemaDto>(`/api/schemas/${encodeURIComponent(schemaId)}`);

export const createSchemaVersion = (
  schemaId: string,
  req: CreateSchemaVersionRequest,
): Promise<SchemaVersionDto> =>
  appFetch<SchemaVersionDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/versions`,
    json("POST", req),
  );

export const getSchemaVersions = (schemaId: string): Promise<SchemaVersionDto[]> =>
  appFetch<SchemaVersionDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/versions`);

export const getSchemaVersion = (versionId: string): Promise<SchemaVersionDto> =>
  appFetch<SchemaVersionDto>(`/api/schema-versions/${encodeURIComponent(versionId)}`);

export const createPredictionRun = (
  versionId: string,
  req: CreatePredictionRunRequest,
): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(
    `/api/schema-versions/${encodeURIComponent(versionId)}/runs`,
    json("POST", req),
  );

export const getPredictionRun = (runId: string): Promise<PredictionRunDto> =>
  appFetch<PredictionRunDto>(`/api/prediction-runs/${encodeURIComponent(runId)}`);

export const getPredictionRuns = (versionId: string): Promise<PredictionRunDto[]> =>
  appFetch<PredictionRunDto[]>(`/api/schema-versions/${encodeURIComponent(versionId)}/runs`);

export const createPredictionResultFeedback = (
  req: CreatePredictionResultFeedbackRequest,
): Promise<PredictionResultFeedbackDto> =>
  appFetch<PredictionResultFeedbackDto>("/api/prediction-result-feedback", json("POST", req));

export const updatePredictionResultFeedback = (
  req: UpdatePredictionResultFeedbackRequest,
): Promise<PredictionResultFeedbackDto> =>
  appFetch<PredictionResultFeedbackDto>("/api/prediction-result-feedback", json("PATCH", req));

export const getPredictionResultFeedback = (
  resultId: string,
): Promise<PredictionResultFeedbackDto[]> =>
  appFetch<PredictionResultFeedbackDto[]>(
    `/api/prediction-result-feedback?resultId=${encodeURIComponent(resultId)}`,
  );
