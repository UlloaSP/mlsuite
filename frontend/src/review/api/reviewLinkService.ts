import { appFetch } from "../../app/api/appFetch";
import type {
	CreateExplanationFeedbackRequest,
	CreateOutputFeedbackRequest,
	ExplanationFeedbackDto,
	ModelDto,
	OutputFeedbackDto,
	PredictionDto,
	SignatureDto,
	TargetDto,
	UpdateExplanationFeedbackRequest,
	UpdateOutputFeedbackRequest,
} from "../../models/api/modelService";

const json = (method: "POST" | "PATCH", body?: unknown): RequestInit => ({
	method,
	headers: { "Content-Type": "application/json" },
	body: body === undefined ? undefined : JSON.stringify(body),
});

export interface CreateReviewLinkRequest {
	modelId: string;
	signatureId: string;
	predictionIds: string[];
	expiresAt?: string;
}

export interface ReviewLinkCreateResponse {
	id: number;
	url: string;
	expiresAt: string;
	predictionCount: number;
}

export interface ReviewLinkSummaryDto {
	id: number;
	modelId: string;
	signatureId: string;
	createdByEmail: string;
	expiresAt: string;
	revokedAt?: string | null;
	createdAt: string;
	token?: string | null;
	predictionCount: number;
}

export interface ReviewPredictionListItemDto {
	selectionToken: string;
	prediction: PredictionDto;
	reviewState: "PENDING" | "REVISION" | "SUBMITTED";
	stateEnteredAt?: string | null;
	submittedAt?: string | null;
}

export interface ReviewLinkContextDto {
	organization: { id: number; name: string };
	model: ModelDto;
	signature: SignatureDto;
	predictions: ReviewPredictionListItemDto[];
}

export interface ReviewPredictionDetailDto {
	prediction: PredictionDto;
	targets: TargetDto[];
	outputFeedback: OutputFeedbackDto[];
	explanationFeedback: ExplanationFeedbackDto[];
}

export const createReviewLink = (request: CreateReviewLinkRequest) =>
	appFetch<ReviewLinkCreateResponse>("/api/review-links", json("POST", request));

export const listReviewLinks = (modelId: string, signatureId: string) =>
	appFetch<ReviewLinkSummaryDto[]>(
		`/api/review-links?modelId=${encodeURIComponent(modelId)}&signatureId=${encodeURIComponent(signatureId)}`,
	);

export const revokeReviewLink = (id: number) =>
	appFetch<void>(`/api/review-links/${id}/revoke`, json("POST"));

export const getReviewContext = (token: string) =>
	appFetch<ReviewLinkContextDto>(`/api/review-links/token/${encodeURIComponent(token)}/context`);

export const getReviewPredictionDetail = (token: string, predictionToken: string) =>
	appFetch<ReviewPredictionDetailDto>(
		`/api/review-links/token/${encodeURIComponent(token)}/predictions/${encodeURIComponent(predictionToken)}`,
	);

export const createReviewOutputFeedback = (token: string, request: CreateOutputFeedbackRequest) =>
	appFetch<OutputFeedbackDto>(
		`/api/review-links/token/${encodeURIComponent(token)}/output-feedback`,
		json("POST", request),
	);

export const updateReviewOutputFeedback = (token: string, request: UpdateOutputFeedbackRequest) =>
	appFetch<OutputFeedbackDto>(
		`/api/review-links/token/${encodeURIComponent(token)}/output-feedback`,
		json("PATCH", request),
	);

export const createReviewExplanationFeedback = (token: string, request: CreateExplanationFeedbackRequest) =>
	appFetch<ExplanationFeedbackDto>(
		`/api/review-links/token/${encodeURIComponent(token)}/explanation-feedback`,
		json("POST", request),
	);

export const updateReviewExplanationFeedback = (token: string, request: UpdateExplanationFeedbackRequest) =>
	appFetch<ExplanationFeedbackDto>(
		`/api/review-links/token/${encodeURIComponent(token)}/explanation-feedback`,
		json("PATCH", request),
	);

export const submitReviewPredictions = (token: string, predictionTokens: string[]) =>
	appFetch<void>(
		`/api/review-links/token/${encodeURIComponent(token)}/submit`,
		json("POST", { predictionTokens }),
	);
