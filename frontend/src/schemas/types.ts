/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type JsonRecord = Record<string, unknown>;

export type SchemaDto = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
};

export type SchemaModelBindingDto = {
  id: string;
  schemaVersionId: string;
  modelId: string;
  signatureId: string;
  inputMapping: JsonRecord;
  outputMapping: JsonRecord;
  pluginPolicy?: JsonRecord | null;
};

export type SchemaVersionDto = {
  id: string;
  schemaId: string;
  version: number;
  name: string;
  formSchema: JsonRecord;
  bindings: SchemaModelBindingDto[];
  createdAt: string;
};

export type PredictionResultStatus = "SUCCESS" | "FAILED";
export type PredictionRunStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";

export type PredictionResultDto = {
  id: string;
  runId: string;
  modelId: string;
  signatureId: string;
  modelInput: JsonRecord;
  output: JsonRecord;
  status: PredictionResultStatus;
  errorMessage?: string | null;
  errorJson?: JsonRecord | null;
  createdAt: string;
};

export type PredictionResultFeedbackType = "OUTPUT" | "EXPLANATION";

export type PredictionResultFeedbackDto = {
  id: string;
  resultId: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  type: PredictionResultFeedbackType;
  order: number;
  value: unknown;
  createdAt: string;
  updatedAt?: string;
};

export type CreatePredictionResultFeedbackRequest = {
  resultId: string;
  type: PredictionResultFeedbackType;
  order: number;
  value: unknown;
};

export type UpdatePredictionResultFeedbackRequest = {
  feedbackId: string;
  value: unknown;
};

export type PredictionRunDto = {
  id: string;
  schemaVersionId: string;
  name: string;
  inputData: JsonRecord;
  status: PredictionRunStatus;
  results: PredictionResultDto[];
  createdAt: string;
  updatedAt?: string;
};

export type CreateSchemaRequest = {
  name: string;
  description?: string;
};

export type CreateSchemaVersionRequest = {
  name: string;
  formSchema: JsonRecord;
  bindings: Array<{
    modelId: string;
    signatureId: string;
    inputMapping?: JsonRecord;
    outputMapping?: JsonRecord;
    pluginPolicy?: JsonRecord;
  }>;
};

export type CreatePredictionRunRequest = {
  name: string;
  inputData: JsonRecord;
  results: Array<{
    modelId: string;
    signatureId: string;
    modelInput: JsonRecord;
    output: JsonRecord;
    status: PredictionResultStatus;
    errorMessage?: string | null;
    errorJson?: JsonRecord | null;
  }>;
};
