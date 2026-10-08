import type {
  PredictionResultDto,
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaModelBindingDto,
  SchemaVersionDto,
} from "@/shared/api/openapi.gen";

/** API DTO fixtures with every contract field present; tests override what they exercise. */

const AT = "2026-06-02T00:00:00Z";

/** Binds model `modelId`; its name `model-<id>` is what report `mappedTo` keys refer to. */
export const binding = (
  modelId: number,
  overrides: Partial<SchemaModelBindingDto> = {},
): SchemaModelBindingDto => ({
  id: modelId,
  schemaVersionId: 1,
  modelId,
  modelName: `model-${modelId}`,
  pluginPolicy: null,
  ...overrides,
});

export const schemaVersion = (overrides: Partial<SchemaVersionDto> = {}): SchemaVersionDto => ({
  id: 1,
  schemaId: 1,
  version: 1,
  name: "v1",
  formSchema: {},
  bindings: [],
  createdAt: AT,
  ...overrides,
});

export const predictionResult = (
  overrides: Partial<PredictionResultDto> = {},
): PredictionResultDto => ({
  id: 1,
  runId: 1,
  modelId: 1,
  modelInput: {},
  output: {},
  status: "SUCCESS",
  errorMessage: null,
  errorJson: null,
  createdAt: AT,
  ...overrides,
});

export const predictionRun = (overrides: Partial<PredictionRunDto> = {}): PredictionRunDto => ({
  id: 1,
  schemaVersionId: 1,
  schemaBookmarkId: null,
  name: "run",
  origin: "WORKSPACE",
  inputData: {},
  status: "SUCCESS",
  results: [],
  createdAt: AT,
  updatedAt: AT,
  createdByName: null,
  createdByEmail: null,
  ...overrides,
});

export const resultFeedback = (
  overrides: Partial<PredictionResultFeedbackDto> = {},
): PredictionResultFeedbackDto => ({
  id: 1,
  resultId: 1,
  userId: 1,
  userName: "Reviewer",
  userEmail: "reviewer@example.com",
  type: "OUTPUT",
  order: 0,
  value: null,
  createdAt: AT,
  updatedAt: AT,
  ...overrides,
});
