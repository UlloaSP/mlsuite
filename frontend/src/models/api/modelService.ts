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
	inputs: Record<string, unknown>;
	prediction: Record<string, unknown>;
}

export interface CreateTargetRequest {
	predictionId: string;
	order: number;
	value: string;          // If your backend expects JSON here, change to `unknown` and pass an object.
}

export interface UpdatePredictionRequest {
	predictionId: string;
	status: string;
}

export interface UpdateTargetRequest {
	targetId: string;
	realValue: object;      // If JSONB, this is fine. Ensure it’s serializable.
}

export interface GetAllSignaturesRequest { modelId: string; }
export interface GetPredictionsRequest { signatureId: string; }
export interface GetTargetsRequest { predictionId: string; }
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
	status: unknown;
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
	return appFetch<CreateModelDto>("/api/model/create", { method: "POST", body: formData });
};

export const createSignature = async (req: CreateSignatureRequest): Promise<SignatureDto> => {
	const payload = {
		...req,
		inputSignature: req.inputSignature,
	};
	return appFetch<SignatureDto>("/api/signature/create", json("POST", payload as Record<string, any>));
};

export const createPrediction = async (req: CreatePredictionRequest): Promise<PredictionDto> => {
	const payload = {
		...req,
		inputs: req.inputs,
		prediction: req.prediction,
	};
	return appFetch<PredictionDto>("/api/prediction/create", json("POST", payload as Record<string, any>));
};

export const createTarget = async (req: CreateTargetRequest): Promise<TargetDto> => {
	// If `value` must be JSONB server-side, consider changing its type to `unknown`
	// and sending an object instead of a bare string.
	return appFetch<TargetDto>("/api/target/create", json("POST", req as Record<string, any>));
};

export const updatePrediction = async (req: UpdatePredictionRequest): Promise<PredictionDto> => {
	return appFetch<PredictionDto>("/api/prediction/update", json("POST", req as Record<string, any>));
};

export const updateTarget = async (req: UpdateTargetRequest): Promise<TargetDto> => {
	return appFetch<TargetDto>("/api/target/update", json("POST", req as Record<string, any>));
};

export const getModels = async (): Promise<ModelDto[]> => {
	return appFetch<ModelDto[]>("/api/model/all");
};

export const getSignatures = async ({ modelId }: GetAllSignaturesRequest): Promise<SignatureDto[]> => {
	const url = `/api/signature/all?modelId=${encodeURIComponent(modelId)}`;
	return appFetch<SignatureDto[]>(url);
};

export const getPredictions = async ({ signatureId }: GetPredictionsRequest): Promise<PredictionDto[]> => {
	const url = `/api/prediction/all?signatureId=${encodeURIComponent(signatureId)}`;
	return appFetch<PredictionDto[]>(url);
};

export const getTargets = async ({ predictionId }: GetTargetsRequest): Promise<TargetDto[]> => {
	const url = `/api/target/all?predictionId=${encodeURIComponent(predictionId)}`;
	return appFetch<TargetDto[]>(url);
};

export const getSignature = async ({ signatureId }: GetSignatureRequest): Promise<SignatureDto> => {
	const url = `/api/signature/${encodeURIComponent(signatureId)}`;
	return appFetch<SignatureDto>(url);
};
