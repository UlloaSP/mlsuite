import { appFetch, json } from "@/shared/api/http";
import type {
  CreateReviewFeedbackRequest,
  CreateSchemaReviewLinkRequest,
  ReviewPredictionResultFeedbackDto,
  SchemaReviewLinkContextDto,
  SchemaReviewLinkCreateResponse,
  SchemaReviewLinkSummaryDto,
  SchemaReviewRunDetailDto,
  UpdateReviewFeedbackRequest,
} from "./review-types";

export const createSchemaReviewLink = (request: CreateSchemaReviewLinkRequest) =>
  appFetch<SchemaReviewLinkCreateResponse>("/api/schema-review-links", json("POST", request));

export const listSchemaReviewLinks = (schemaId: string, versionId: string, signal?: AbortSignal) =>
  appFetch<SchemaReviewLinkSummaryDto[]>(
    `/api/schema-review-links?schemaId=${encodeURIComponent(schemaId)}&versionId=${encodeURIComponent(versionId)}`,
    { signal },
  );

export const revokeSchemaReviewLink = (id: number) =>
  appFetch<void>(`/api/schema-review-links/${id}/revoke`, json("POST"));

export const getSchemaReviewContext = (token: string, signal?: AbortSignal) =>
  appFetch<SchemaReviewLinkContextDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/context`,
    { signal },
  );

export const getSchemaReviewRunDetail = (token: string, runToken: string, signal?: AbortSignal) =>
  appFetch<SchemaReviewRunDetailDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/runs/${encodeURIComponent(runToken)}`,
    { signal },
  );

export const createSchemaReviewFeedback = (token: string, request: CreateReviewFeedbackRequest) =>
  appFetch<ReviewPredictionResultFeedbackDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/feedback`,
    json("POST", request),
  );

export const updateSchemaReviewFeedback = (token: string, request: UpdateReviewFeedbackRequest) =>
  appFetch<ReviewPredictionResultFeedbackDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/feedback`,
    json("PATCH", request),
  );

export const submitSchemaReviewRuns = (token: string, runTokens: string[]) =>
  appFetch<void>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/submit`,
    json("POST", { runTokens }),
  );
