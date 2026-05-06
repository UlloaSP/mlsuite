/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../app/api/appFetch";

/** ---------- DTOs ---------- */
export interface CreateModelRequest {
	name: string;
	modelFile: File;
	dataframeFile?: File;
}

export interface CreateSignatureRequest {
	modelId: string;
	name: string;
	inputSignature: Record<string, unknown>;
	major: number;
	minor: number;
	patch: number;
	origin?: string;
}

export interface CreatePredictionRequest {
	signatureId: string;
	name: string;
	overwrite?: boolean;
	inputs: Record<string, unknown>;
	prediction: Record<string, unknown>;
}

export interface CreateTargetRequest {
	predictionId: string;
	order: number;
	value: unknown;
}

export interface UpdatePredictionRequest {
	predictionId: string;
	status: "PENDING" | "COMPLETED";
}

export interface UpdateTargetRequest {
	targetId: string;
	realValue?: unknown | null;
}

export interface CreateOutputFeedbackRequest {
	predictionId: string;
	order: number;
	value: unknown;
}

export interface UpdateOutputFeedbackRequest {
	outputFeedbackId: string;
	value: unknown;
}

export interface CreateExplanationFeedbackRequest {
	predictionId: string;
	order: number;
	value: unknown;
}

export interface UpdateExplanationFeedbackRequest {
	explanationFeedbackId: string;
	realValue: unknown;
}

export interface GetAllSignaturesRequest { modelId: string; }
export interface GetPredictionsRequest { signatureId: string; }
export interface GetTargetsRequest { predictionId: string; }
export interface GetOutputFeedbackRequest { predictionId: string; }
export interface GetExplanationFeedbackRequest { predictionId: string; }
export interface GetSignatureRequest { signatureId: string; }

export interface ModelDto {
	id: string;
	name: string;
	type: string;
	specificType: string;
	fileName: string;
	createdAt: string;
}

export interface SignatureDto {
	id: string;
	modelId: string;
	name: string;
	inputSignature: Record<string, unknown>;
	major: number;
	minor: number;
	patch: number;
	origin?: SignatureDto;
	createdAt: string;
}

export interface PredictionDto {
	id: string;
	signatureId: string;
	modelId: string;
	name: string;
	inputs: Record<string, unknown>;
	prediction: Record<string, unknown>;
	status: "PENDING" | "COMPLETED" | "SUCCESS" | "FAILED" | unknown;
	createdAt: string;
	updatedAt?: string;
}

export interface TargetDto {
	id: string;
	predictionId: string;
	order: number;
	value: unknown;
	realValue?: unknown;
	createdAt: string;
	updatedAt?: string;
}

export interface OutputFeedbackDto {
	id: string;
	predictionId: string;
	userId: number;
	userName: string;
	userEmail: string;
	order: number;
	value: unknown;
	createdAt: string;
	updatedAt?: string;
}

export interface ExplanationFeedbackDto {
	id: string;
	predictionId: string;
	userId: number;
	userName: string;
	userEmail: string;
	order: number;
	value: unknown;
	realValue?: unknown;
	createdAt: string;
	updatedAt?: string;
}

export interface CreateModelDto {
	model: ModelDto;
	signatureFromModel: SignatureDto;
	signatureFromDataframe: SignatureDto;
}

/** ---------- helpers ---------- */
const json = (method: "POST" | "PUT" | "PATCH", body: unknown): RequestInit => ({
	method,
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify(body),
});

/** ---------- services ---------- */
export const createModel = async ({
	name,
	modelFile,
	dataframeFile,
}: CreateModelRequest): Promise<CreateModelDto> => {
	const formData = new FormData();
	formData.append("name", name);
	formData.append("modelFile", modelFile);
	if (dataframeFile) formData.append("dataframeFile", dataframeFile);

	// Browser sets multipart boundary; do not set Content-Type manually
	return appFetch<CreateModelDto>("/api/models", { method: "POST", body: formData });
};

export const createSignature = async (req: CreateSignatureRequest): Promise<SignatureDto> => {
	const payload = {
		...req,
		inputSignature: req.inputSignature,
	};
	return appFetch<SignatureDto>("/api/signatures", json("POST", payload as Record<string, any>));
};

export const createPrediction = async (req: CreatePredictionRequest): Promise<PredictionDto> => {
	const payload = {
		...req,
		inputs: req.inputs,
		prediction: req.prediction,
	};
	return appFetch<PredictionDto>("/api/predictions", json("POST", payload as Record<string, any>));
};

export const createTarget = async (req: CreateTargetRequest): Promise<TargetDto> => {
	return appFetch<TargetDto>("/api/targets", json("POST", req as Record<string, any>));
};

export const updatePrediction = async (req: UpdatePredictionRequest): Promise<PredictionDto> => {
	return appFetch<PredictionDto>("/api/predictions", json("PATCH", req as Record<string, any>));
};

export const updateTarget = async (req: UpdateTargetRequest): Promise<TargetDto> => {
	return appFetch<TargetDto>("/api/targets", json("PATCH", req as Record<string, any>));
};

export const createOutputFeedback = async (
	req: CreateOutputFeedbackRequest,
): Promise<OutputFeedbackDto> =>
	appFetch<OutputFeedbackDto>("/api/output-feedback", json("POST", req as Record<string, any>));

export const updateOutputFeedback = async (
	req: UpdateOutputFeedbackRequest,
): Promise<OutputFeedbackDto> =>
	appFetch<OutputFeedbackDto>("/api/output-feedback", json("PATCH", req as Record<string, any>));

export const createExplanationFeedback = async (
	req: CreateExplanationFeedbackRequest,
): Promise<ExplanationFeedbackDto> =>
	appFetch<ExplanationFeedbackDto>(
		"/api/explanation-feedback",
		json("POST", req as Record<string, any>),
	);

export const updateExplanationFeedback = async (
	req: UpdateExplanationFeedbackRequest,
): Promise<ExplanationFeedbackDto> =>
	appFetch<ExplanationFeedbackDto>(
		"/api/explanation-feedback",
		json("PATCH", req as Record<string, any>),
	);

export const getModels = async (): Promise<ModelDto[]> => {
	return appFetch<ModelDto[]>("/api/models");
};

export const getSignatures = async ({ modelId }: GetAllSignaturesRequest): Promise<SignatureDto[]> => {
	const url = `/api/signatures?modelId=${encodeURIComponent(modelId)}`;
	return appFetch<SignatureDto[]>(url);
};

export const getPredictions = async ({ signatureId }: GetPredictionsRequest): Promise<PredictionDto[]> => {
	const url = `/api/predictions?signatureId=${encodeURIComponent(signatureId)}`;
	return appFetch<PredictionDto[]>(url);
};

export const getTargets = async ({ predictionId }: GetTargetsRequest): Promise<TargetDto[]> => {
	const url = `/api/targets?predictionId=${encodeURIComponent(predictionId)}`;
	return appFetch<TargetDto[]>(url);
};

export const getOutputFeedback = async ({
	predictionId,
}: GetOutputFeedbackRequest): Promise<OutputFeedbackDto[]> => {
	const url = `/api/output-feedback?predictionId=${encodeURIComponent(predictionId)}`;
	return appFetch<OutputFeedbackDto[]>(url);
};

export const getExplanationFeedback = async ({
	predictionId,
}: GetExplanationFeedbackRequest): Promise<ExplanationFeedbackDto[]> => {
	const url = `/api/explanation-feedback?predictionId=${encodeURIComponent(predictionId)}`;
	return appFetch<ExplanationFeedbackDto[]>(url);
};

export const getSignature = async ({ signatureId }: GetSignatureRequest): Promise<SignatureDto> => {
	const url = `/api/signatures/${encodeURIComponent(signatureId)}`;
	return appFetch<SignatureDto>(url);
};
