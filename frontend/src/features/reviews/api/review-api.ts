import { appFetch, json } from "@/shared/api/http";
import type {
  CreateReviewFeedbackRequest,
  ReviewPredictionResultFeedbackDto,
  SchemaReviewContextDto,
  SchemaReviewRunDetailDto,
  UpdateReviewFeedbackRequest,
} from "./review-types";

export const getSchemaReviewInbox = (signal?: AbortSignal) =>
  appFetch<SchemaReviewContextDto[]>("/api/schema-reviews/inbox", { signal });

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
  request: CreateReviewFeedbackRequest,
) =>
  appFetch<ReviewPredictionResultFeedbackDto>(
    `/api/schema-reviews/${encodeURIComponent(reviewId)}/runs/${encodeURIComponent(reviewRunId)}/feedback`,
    json("POST", request),
  );

export const updateSchemaReviewFeedback = (
  reviewId: string,
  reviewRunId: string,
  request: UpdateReviewFeedbackRequest,
) =>
  appFetch<ReviewPredictionResultFeedbackDto>(
    `/api/schema-reviews/${encodeURIComponent(reviewId)}/runs/${encodeURIComponent(reviewRunId)}/feedback`,
    json("PATCH", request),
  );

export const submitSchemaReviewRuns = (reviewId: string, reviewRunIds: string[]) =>
  appFetch<void>(
    `/api/schema-reviews/${encodeURIComponent(reviewId)}/submit`,
    json("POST", { reviewRunIds }),
  );
