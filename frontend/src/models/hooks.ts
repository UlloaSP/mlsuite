import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ModelDto, PredictionDto, SignatureDto } from "./api/modelService";
import * as modelApi from "./api/modelService";

export const CREATE_MODEL_QUERY_KEY = ["createModel"]

export function useCreateModelMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: CREATE_MODEL_QUERY_KEY,
        mutationFn: (data: modelApi.CreateModelRequest) => modelApi.createModel(data),
        onSuccess: (CreateModel: modelApi.CreateModelDto) => {
            queryClient.setQueryData<ModelDto[]>(
                GET_MODELS_QUERY_KEY,
                (prev) => prev ? [CreateModel.model, ...prev] : [CreateModel.model],
            );
            queryClient.setQueryData<SignatureDto[]>(
                GET_SIGNATURES_QUERY_KEY({ modelId: CreateModel.model.id }),
                (prev) => {
                    if (!prev && !CreateModel.signatureFromDataframe) {
                        return [CreateModel.signatureFromModel];
                    }

                    if (!prev && CreateModel.signatureFromDataframe) {
                        return [CreateModel.signatureFromDataframe, CreateModel.signatureFromModel];
                    }

                    if (!CreateModel.signatureFromDataframe) {
                        return [CreateModel.signatureFromModel, ...prev!];
                    }

                    return [CreateModel.signatureFromDataframe, CreateModel.signatureFromModel, ...prev!]
                }
            );
        },
    })
};

export const CREATE_SIGNATURE_QUERY_KEY = ["createSignature"]

export function useCreateSignatureMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: CREATE_SIGNATURE_QUERY_KEY,
        mutationFn: (data: modelApi.CreateSignatureRequest) => modelApi.createSignature(data),
        onSuccess: (signature: SignatureDto) => {
            queryClient.setQueryData<SignatureDto[]>(
                GET_SIGNATURES_QUERY_KEY({ modelId: signature.modelId }),
                (prev) => prev ? [signature, ...prev] : [signature],
            );
        },
    })
};

export const CREATE_PREDICTION_QUERY_KEY = ["createPrediction"]

export function useCreatePredictionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: CREATE_PREDICTION_QUERY_KEY,
        mutationFn: (data: modelApi.CreatePredictionRequest) => modelApi.createPrediction(data),
        onSuccess: (prediction: modelApi.PredictionDto) => {
            queryClient.setQueryData<PredictionDto[]>(
                GET_PREDICTIONS_QUERY_KEY({ signatureId: prediction.signatureId }),
                (prev) => prev ? [prediction, ...prev] : [prediction],
            );
        },
    })
};

export const CREATE_TARGET_QUERY_KEY = ["createTarget"]
export function useCreateTargetMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: CREATE_TARGET_QUERY_KEY,
        mutationFn: (data: modelApi.CreateTargetRequest) => modelApi.createTarget(data),
        onSuccess: (target: modelApi.TargetDto) => {
            queryClient.setQueryData<modelApi.TargetDto[]>(
                GET_TARGETS_QUERY_KEY({ predictionId: target.predictionId }),
                (prev) => prev ? [target, ...prev] : [target],
            );
        },
    })
};

export const UPDATE_PREDICTION_QUERY_KEY = ["updatePrediction"]
export function useUpdatePredictionMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: UPDATE_PREDICTION_QUERY_KEY,
        mutationFn: (data: modelApi.UpdatePredictionRequest) => modelApi.updatePrediction(data),
        onSuccess: (prediction: PredictionDto) => {
            queryClient.setQueryData<PredictionDto[]>(
                GET_PREDICTIONS_QUERY_KEY({ signatureId: prediction.signatureId }),
                (prev) => prev ? prev.map(p => p.id === prediction.id ? prediction : p) : [prediction],
            );
        },
    })
};

export const UPDATE_TARGET_QUERY_KEY = ["updateTarget"]
export function useUpdateTargetMutation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationKey: UPDATE_TARGET_QUERY_KEY,
        mutationFn: (data: modelApi.UpdateTargetRequest) => modelApi.updateTarget(data),
        onSuccess: (target: modelApi.TargetDto) => {
            queryClient.setQueryData<modelApi.TargetDto[]>(
                GET_TARGETS_QUERY_KEY({ predictionId: target.predictionId }),
                (prev) => prev ? prev.map(t => t.id === target.id ? target : t) : [target],
            );
        },
    })
}


export const GET_MODELS_QUERY_KEY = ["getModels"]

export const useGetModels = () =>
    useQuery({
        queryKey: GET_MODELS_QUERY_KEY,
        queryFn: modelApi.getModels,
        gcTime: 10 * 60_000, // 30 min en caché
    });

export const GET_SIGNATURES_QUERY_KEY = ({ modelId }: modelApi.GetAllSignaturesRequest) => ["getSignatures", { modelId }] as const;

export const useGetSignatures = ({ modelId }: modelApi.GetAllSignaturesRequest) =>
    useQuery({
        queryKey: GET_SIGNATURES_QUERY_KEY({ modelId }),
        queryFn: () => modelApi.getSignatures({ modelId }),
        enabled: Boolean(modelId),
        placeholderData: [],
        gcTime: 10 * 60_000,
    });

export const GET_PREDICTIONS_QUERY_KEY = ({ signatureId }: modelApi.GetPredictionsRequest) => ["getPredictions", { signatureId }] as const;

export const useGetPredictions = ({ signatureId }: modelApi.GetPredictionsRequest) =>
    useQuery({
        queryKey: GET_PREDICTIONS_QUERY_KEY({ signatureId }),
        queryFn: () => modelApi.getPredictions({ signatureId }),
        enabled: Boolean(signatureId),
        placeholderData: [],
        gcTime: 10 * 60_000,
    });

export const GET_TARGETS_QUERY_KEY = ({ predictionId }: modelApi.GetTargetsRequest) => ["getTargets", { predictionId }] as const;

export const useGetTargets = ({ predictionId }: modelApi.GetTargetsRequest) =>
    useQuery({
        queryKey: GET_TARGETS_QUERY_KEY({ predictionId }),
        queryFn: () => modelApi.getTargets({ predictionId }),
        enabled: Boolean(predictionId),
        placeholderData: [],
        gcTime: 10 * 60_000,
    });

export const GET_SIGNATURE_QUERY_KEY = ({ signatureId }: modelApi.GetSignatureRequest) => ["getSignature", { signatureId }] as const;

export const useGetSignature = ({ signatureId }: modelApi.GetSignatureRequest) =>
    useQuery({
        queryKey: GET_SIGNATURE_QUERY_KEY({ signatureId }),
        queryFn: () => modelApi.getSignature({ signatureId }),
        enabled: Boolean(signatureId),
        gcTime: 10 * 60_000,
    });

