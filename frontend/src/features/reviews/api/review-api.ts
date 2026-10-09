import { appFetch, json } from "@/shared/api/http";
import type {
  CreatePredictionResultFeedbackRequest,
  PredictionResultFeedbackDto,
  SchemaReviewRunDetailDto,
  SubmitSchemaReviewRunsRequest,
  UpdatePredictionResultFeedbackRequest,
} from "@/shared/api/openapi.gen";

export const getSchemaReviewRunDetail = (
  reviewId: string,
  reviewRunId: string,
  signal?: AbortSignal,
) =>
  appFetch<SchemaReviewRunDetailDto>(
    `/api/schema-reviews/${encodeURIComponent(reviewId)}/runs/${encodeURIComponent(reviewRunId)}`,
    { signal },
  );

export const createSchemaReviewFeedback = (
  reviewId: string,
  reviewRunId: string,
  request: CreatePredictionResultFeedbackRequest,
) =>
  appFetch<PredictionResultFeedbackDto>(
    `/api/schema-reviews/${encodeURIComponent(reviewId)}/runs/${encodeURIComponent(reviewRunId)}/feedback`,
    json("POST", request),
  );

export const updateSchemaReviewFeedback = (
  reviewId: string,
  reviewRunId: string,
  request: UpdatePredictionResultFeedbackRequest,
) =>
  appFetch<PredictionResultFeedbackDto>(
    `/api/schema-reviews/${encodeURIComponent(reviewId)}/runs/${encodeURIComponent(reviewRunId)}/feedback`,
    json("PATCH", request),
  );

export const submitSchemaReviewRuns = (reviewId: string, reviewRunIds: string[]) =>
  appFetch<void>(
    `/api/schema-reviews/${encodeURIComponent(reviewId)}/submit`,
    json("POST", { reviewRunIds } satisfies SubmitSchemaReviewRunsRequest),
  );
