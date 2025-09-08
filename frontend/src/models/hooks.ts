import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
	ModelDto,
	PredictionDto,
	SignatureDto,
} from "./api/modelService";
import * as modelApi from "./api/modelService";

/** -------------------- Query Keys -------------------- */
export const GET_MODELS_QUERY_KEY = ["getModels"] as const;

export const GET_SIGNATURES_QUERY_KEY = (p: modelApi.GetAllSignaturesRequest) =>
	["getSignatures", { modelId: p.modelId }] as const;

export const GET_PREDICTIONS_QUERY_KEY = (p: modelApi.GetPredictionsRequest) =>
	["getPredictions", { signatureId: p.signatureId }] as const;

export const GET_TARGETS_QUERY_KEY = (p: modelApi.GetTargetsRequest) =>
	["getTargets", { predictionId: p.predictionId }] as const;

export const GET_SIGNATURE_QUERY_KEY = (p: modelApi.GetSignatureRequest) =>
	["getSignature", { signatureId: p.signatureId }] as const;

/** -------------------- Reads -------------------- */
export const useGetModels = () =>
	useQuery({
		queryKey: GET_MODELS_QUERY_KEY,
		queryFn: modelApi.getModels,
		staleTime: 5 * 60_000,
		gcTime: 10 * 60_000,
		retry: (count, err: any) => {
			const s = err?.status ?? err?.response?.status;
			if (s === 401 || s === 403) return false;
			return count < 2;
		},
	});

export const useGetSignatures = ({ modelId }: modelApi.GetAllSignaturesRequest) =>
	useQuery({
		queryKey: GET_SIGNATURES_QUERY_KEY({ modelId }),
		queryFn: () => modelApi.getSignatures({ modelId }),
		enabled: Boolean(modelId),
		placeholderData: [],
		staleTime: 5 * 60_000,
		gcTime: 10 * 60_000,
		retry: (count, err: any) => {
			const s = err?.status ?? err?.response?.status;
			if (s === 401 || s === 403) return false;
			return count < 2;
		},
	});

export const useGetPredictions = ({ signatureId }: modelApi.GetPredictionsRequest) =>
	useQuery({
		queryKey: GET_PREDICTIONS_QUERY_KEY({ signatureId }),
		queryFn: () => modelApi.getPredictions({ signatureId }),
		enabled: Boolean(signatureId),
		placeholderData: [],
		staleTime: 5 * 60_000,
		gcTime: 10 * 60_000,
		retry: (count, err: any) => {
			const s = err?.status ?? err?.response?.status;
			if (s === 401 || s === 403) return false;
			return count < 2;
		},
	});

export const useGetTargets = ({ predictionId }: modelApi.GetTargetsRequest) =>
	useQuery({
		queryKey: GET_TARGETS_QUERY_KEY({ predictionId }),
		queryFn: () => modelApi.getTargets({ predictionId }),
		enabled: Boolean(predictionId),
		placeholderData: [],
		staleTime: 5 * 60_000,
		gcTime: 10 * 60_000,
		retry: (count, err: any) => {
			const s = err?.status ?? err?.response?.status;
			if (s === 401 || s === 403) return false;
			return count < 2;
		},
	});

export const useGetSignature = ({ signatureId }: modelApi.GetSignatureRequest) =>
	useQuery({
		queryKey: GET_SIGNATURE_QUERY_KEY({ signatureId }),
		queryFn: () => modelApi.getSignature({ signatureId }),
		enabled: Boolean(signatureId),
		staleTime: 5 * 60_000,
		gcTime: 10 * 60_000,
		retry: (count, err: any) => {
			const s = err?.status ?? err?.response?.status;
			if (s === 401 || s === 403) return false;
			return count < 2;
		},
	});

/** -------------------- Writes -------------------- */
export const CREATE_MODEL_QUERY_KEY = ["createModel"] as const;

export function useCreateModelMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: CREATE_MODEL_QUERY_KEY,
		mutationFn: (data: modelApi.CreateModelRequest) => modelApi.createModel(data),
		onSuccess: (created: modelApi.CreateModelDto) => {
			// 1) Prepend model to models list
			qc.setQueryData<ModelDto[]>(GET_MODELS_QUERY_KEY, (prev) =>
				prev ? [created.model, ...prev] : [created.model],
			);

			// 2) Seed signatures cache for that model
			qc.setQueryData<SignatureDto[]>(
				GET_SIGNATURES_QUERY_KEY({ modelId: created.model.id }),
				(prev) => {
					const fromDf = created.signatureFromDataframe;
					const fromModel = created.signatureFromModel;

					if (!prev && !fromDf) return [fromModel];
					if (!prev && fromDf) return [fromDf, fromModel];
					if (!fromDf) return [fromModel, ...(prev as SignatureDto[])];

					return [fromDf, fromModel, ...(prev as SignatureDto[])];
				},
			);
		},
	});
}

export const CREATE_SIGNATURE_QUERY_KEY = ["createSignature"] as const;

export function useCreateSignatureMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: CREATE_SIGNATURE_QUERY_KEY,
		mutationFn: (data: modelApi.CreateSignatureRequest) => modelApi.createSignature(data),
		onSuccess: (signature: SignatureDto) => {
			qc.setQueryData<SignatureDto[]>(
				GET_SIGNATURES_QUERY_KEY({ modelId: signature.modelId }),
				(prev) => (prev ? [signature, ...prev] : [signature]),
			);
		},
	});
}

export const CREATE_PREDICTION_QUERY_KEY = ["createPrediction"] as const;

export function useCreatePredictionMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: CREATE_PREDICTION_QUERY_KEY,
		mutationFn: (data: modelApi.CreatePredictionRequest) => modelApi.createPrediction(data),
		onSuccess: (prediction: modelApi.PredictionDto) => {
			qc.setQueryData<PredictionDto[]>(
				GET_PREDICTIONS_QUERY_KEY({ signatureId: prediction.signatureId }),
				(prev) => (prev ? [prediction, ...prev] : [prediction]),
			);
		},
	});
}

export const CREATE_TARGET_QUERY_KEY = ["createTarget"] as const;

export function useCreateTargetMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: CREATE_TARGET_QUERY_KEY,
		mutationFn: (data: modelApi.CreateTargetRequest) => modelApi.createTarget(data),
		onSuccess: (target: modelApi.TargetDto) => {
			qc.setQueryData<modelApi.TargetDto[]>(
				GET_TARGETS_QUERY_KEY({ predictionId: target.predictionId }),
				(prev) => (prev ? [target, ...prev] : [target]),
			);
		},
	});
}

export const UPDATE_PREDICTION_QUERY_KEY = ["updatePrediction"] as const;

export function useUpdatePredictionMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: UPDATE_PREDICTION_QUERY_KEY,
		mutationFn: (data: modelApi.UpdatePredictionRequest) => modelApi.updatePrediction(data),
		onSuccess: (prediction: PredictionDto) => {
			qc.setQueryData<PredictionDto[]>(
				GET_PREDICTIONS_QUERY_KEY({ signatureId: prediction.signatureId }),
				(prev) =>
					prev
						? prev.map((p) => (p.id === prediction.id ? prediction : p))
						: [prediction],
			);
		},
	});
}

export const UPDATE_TARGET_QUERY_KEY = ["updateTarget"] as const;

export function useUpdateTargetMutation() {
	const qc = useQueryClient();
	return useMutation({
		mutationKey: UPDATE_TARGET_QUERY_KEY,
		mutationFn: (data: modelApi.UpdateTargetRequest) => modelApi.updateTarget(data),
		onSuccess: (target: modelApi.TargetDto) => {
			qc.setQueryData<modelApi.TargetDto[]>(
				GET_TARGETS_QUERY_KEY({ predictionId: target.predictionId }),
				(prev) =>
					prev ? prev.map((t) => (t.id === target.id ? target : t)) : [target],
			);
		},
	});
}
