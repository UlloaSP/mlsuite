/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { JsonRecord } from "./schema-types";

export type CreatePredictionResultFeedbackRequest = {
  resultId: string;
  type: PredictionResultFeedbackType;
  order: number;
  value: unknown;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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
    feedback?: Array<{
      type: PredictionResultFeedbackType;
      order: number;
      value: unknown;
    }>;
  }>;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

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

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type PredictionResultFeedbackType = "OUTPUT" | "EXPLANATION";

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type PredictionResultStatus = "SUCCESS" | "FAILED";

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type PredictionRunDto = {
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

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type PredictionRunStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type UpdatePredictionResultFeedbackRequest = {
  feedbackId: string;
  value: unknown;
};
