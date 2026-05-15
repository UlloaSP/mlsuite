import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as reviewApi from "./api/reviewLinkService";

const REVIEW_CONTEXT_QUERY_KEY = (token: string) => ["reviewContext", { token }] as const;
const REVIEW_DETAIL_QUERY_KEY = (token: string, predictionId: string) =>
	["reviewPrediction", { token, predictionId }] as const;
const REVIEW_LINKS_QUERY_KEY = (modelId: string, signatureId: string) =>
	["reviewLinks", { modelId, signatureId }] as const;

export const useReviewContext = (token: string) =>
	useQuery({
		queryKey: REVIEW_CONTEXT_QUERY_KEY(token),
		queryFn: () => reviewApi.getReviewContext(token),
		enabled: Boolean(token),
		retry: false,
	});

export const useReviewPredictionDetail = (token: string, predictionId: string) =>
	useQuery({
		queryKey: REVIEW_DETAIL_QUERY_KEY(token, predictionId),
		queryFn: () => reviewApi.getReviewPredictionDetail(token, predictionId),
		enabled: Boolean(token && predictionId),
		retry: false,
	});

export const useReviewLinks = (modelId: string, signatureId: string) =>
	useQuery({
		queryKey: REVIEW_LINKS_QUERY_KEY(modelId, signatureId),
		queryFn: () => reviewApi.listReviewLinks(modelId, signatureId),
		enabled: Boolean(modelId && signatureId),
		placeholderData: [],
	});

export function useCreateReviewLinkMutation(modelId: string, signatureId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: reviewApi.createReviewLink,
		onSuccess: () => qc.invalidateQueries({ queryKey: REVIEW_LINKS_QUERY_KEY(modelId, signatureId) }),
	});
}

export function useRevokeReviewLinkMutation(modelId: string, signatureId: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: reviewApi.revokeReviewLink,
		onSuccess: () => qc.invalidateQueries({ queryKey: REVIEW_LINKS_QUERY_KEY(modelId, signatureId) }),
	});
}

export function useSubmitReviewPredictionsMutation(token: string) {
	const qc = useQueryClient();
	return useMutation({
		mutationFn: (predictionIds: string[]) => reviewApi.submitReviewPredictions(token, predictionIds),
		onSuccess: () => qc.invalidateQueries({ queryKey: REVIEW_CONTEXT_QUERY_KEY(token) }),
	});
}
