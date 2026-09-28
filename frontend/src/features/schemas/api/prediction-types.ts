/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord } from "./schema-types";

export type CreatePredictionRunRequest = {
  /** The snapshot that ran; saving fails if the bookmark has moved since. */
  schemaVersionId: string;
  name: string;
  inputData: JsonRecord;
  results: Array<{
    modelId: string;
    modelInput: JsonRecord;
    output: JsonRecord;
    status: PredictionResultStatus;
    errorMessage?: string | null;
    errorJson?: JsonRecord | null;
    feedback?: Array<{
      type: PredictionResultFeedbackType;
      order: number;
      value: unknown;
    }>;
  }>;
};

export type PredictionResultDto = {
  id: string;
  runId: string;
  modelId: string;
  modelInput: JsonRecord;
  output: JsonRecord;
  status: PredictionResultStatus;
  errorMessage?: string | null;
  errorJson?: JsonRecord | null;
  createdAt: string;
};

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

export type PredictionResultFeedbackType = "OUTPUT" | "EXPLANATION";

export type PredictionResultStatus = "SUCCESS" | "FAILED";

export type PredictionRunDto = {
  createdByName?: string | null;
  createdByEmail?: string | null;
  id: string;
  schemaVersionId: string;
  schemaBookmarkId?: string | null;
  name: string;
  inputData: JsonRecord;
  status: PredictionRunStatus;
  results: PredictionResultDto[];
  createdAt: string;
  updatedAt?: string;
};

export type PredictionRunStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
