import { appFetch } from "../../app/api/appFetch";
import type {
  CreatePredictionResultFeedbackRequest,
  PredictionResultFeedbackDto,
  PredictionRunDto,
  SchemaDto,
  SchemaVersionDto,
  UpdatePredictionResultFeedbackRequest,
} from "../../schemas/types";

const json = (method: "POST" | "PATCH", body?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: body === undefined ? undefined : JSON.stringify(body),
});

export type CreateSchemaReviewLinkRequest = {
  schemaId: string;
  versionId: string;
  runIds: string[];
  expiresAt?: string;
};

export type SchemaReviewLinkCreateResponse = {
  id: number;
  url: string;
  expiresAt: string;
  runCount: number;
};

export type SchemaReviewLinkSummaryDto = {
  id: number;
  schemaId: string;
  versionId: string;
  createdByEmail: string;
  expiresAt: string;
  revokedAt?: string | null;
  createdAt: string;
  token?: string | null;
  runCount: number;
};

export type SchemaReviewRunListItemDto = {
  selectionToken: string;
  run: PredictionRunDto;
  reviewState: "PENDING" | "REVISION" | "SUBMITTED";
  stateEnteredAt?: string | null;
  submittedAt?: string | null;
};

export type SchemaReviewLinkContextDto = {
  organization: { id: number; name: string };
  schema: SchemaDto;
  schemaVersion: SchemaVersionDto;
  runs: SchemaReviewRunListItemDto[];
};

export type SchemaReviewRunDetailDto = {
  run: PredictionRunDto;
  feedback: PredictionResultFeedbackDto[];
};

export const createSchemaReviewLink = (request: CreateSchemaReviewLinkRequest) =>
  appFetch<SchemaReviewLinkCreateResponse>("/api/schema-review-links", json("POST", request));

export const listSchemaReviewLinks = (schemaId: string, versionId: string) =>
  appFetch<SchemaReviewLinkSummaryDto[]>(
    `/api/schema-review-links?schemaId=${encodeURIComponent(schemaId)}&versionId=${encodeURIComponent(versionId)}`,
  );

export const revokeSchemaReviewLink = (id: number) =>
  appFetch<void>(`/api/schema-review-links/${id}/revoke`, json("POST"));

export const getSchemaReviewContext = (token: string) =>
  appFetch<SchemaReviewLinkContextDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/context`,
  );

export const getSchemaReviewRunDetail = (token: string, runToken: string) =>
  appFetch<SchemaReviewRunDetailDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/runs/${encodeURIComponent(runToken)}`,
  );

export const createSchemaReviewFeedback = (
  token: string,
  request: CreatePredictionResultFeedbackRequest,
) =>
  appFetch<PredictionResultFeedbackDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/feedback`,
    json("POST", request),
  );

export const updateSchemaReviewFeedback = (
  token: string,
  request: UpdatePredictionResultFeedbackRequest,
) =>
  appFetch<PredictionResultFeedbackDto>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/feedback`,
    json("PATCH", request),
  );

export const submitSchemaReviewRuns = (token: string, runTokens: string[]) =>
  appFetch<void>(
    `/api/schema-review-links/token/${encodeURIComponent(token)}/submit`,
    json("POST", { runTokens }),
  );
