/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

type JsonRecord = Record<string, unknown>;

export type ReviewSchemaDto = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt?: string;
  archivedAt?: string | null;
};

export type ReviewSchemaVersionDto = {
  id: string;
  schemaId: string;
  version: number;
  name: string;
  formSchema: JsonRecord;
  bindings: Array<{
    id?: string;
    schemaVersionId?: string;
    modelId: string;
    modelName?: string;
    pluginPolicy?: JsonRecord | null;
  }>;
  createdAt: string;
};

export type ReviewPredictionResultDto = {
  id: string;
  runId: string;
  modelId: string;
  modelInput: JsonRecord;
  output: JsonRecord;
  status: "SUCCESS" | "FAILED";
  errorMessage?: string | null;
  errorJson?: JsonRecord | null;
  createdAt: string;
};

export type ReviewPredictionRunDto = {
  id: string;
  schemaVersionId: string;
  schemaBookmarkId?: string | null;
  name: string;
  inputData: JsonRecord;
  status: "SUCCESS" | "PARTIAL_SUCCESS" | "FAILED";
  results: ReviewPredictionResultDto[];
  createdAt: string;
  updatedAt?: string;
};

export type ReviewPredictionResultFeedbackDto = {
  id: string;
  resultId: string;
  userId?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  type: "OUTPUT" | "EXPLANATION";
  order: number;
  value: unknown;
  createdAt: string;
  updatedAt?: string;
};

export type CreateReviewFeedbackRequest = {
  resultId: string;
  type: "OUTPUT" | "EXPLANATION";
  order: number;
  value: unknown;
};

export type UpdateReviewFeedbackRequest = {
  feedbackId: string;
  value: unknown;
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaReviewLinkContextDto = {
  organization: { id: number; name: string };
  schema: ReviewSchemaDto;
  schemaVersion: ReviewSchemaVersionDto;
  runs: SchemaReviewRunListItemDto[];
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaReviewRunDetailDto = {
  run: ReviewPredictionRunDto;
  feedback: ReviewPredictionResultFeedbackDto[];
};

/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type SchemaReviewRunListItemDto = {
  selectionToken: string;
  run: ReviewPredictionRunDto;
  reviewState: "PENDING" | "REVISION" | "SUBMITTED";
  stateEnteredAt?: string | null;
  submittedAt?: string | null;
};
