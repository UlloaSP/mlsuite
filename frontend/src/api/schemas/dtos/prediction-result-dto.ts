/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord, PredictionResultStatus } from "./index";

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
