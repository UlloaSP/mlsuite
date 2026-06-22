/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord, PredictionResultStatus } from "./index";

export type CreatePredictionRunRequest = {
  name: string;
  inputData: JsonRecord;
  results: Array<{
    modelId: string;
    modelInput: JsonRecord;
    output: JsonRecord;
    status: PredictionResultStatus;
    errorMessage?: string | null;
    errorJson?: JsonRecord | null;
  }>;
};
