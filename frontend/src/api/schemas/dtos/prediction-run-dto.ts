/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord, PredictionRunStatus, PredictionResultDto } from "./index";

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
