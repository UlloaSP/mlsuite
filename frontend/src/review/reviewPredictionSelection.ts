import type { ReviewPredictionListItemDto } from "./api/reviewLinkService";

export const normalizeReviewPredictionId = (id: unknown): string => String(id);

export const firstReviewPredictionId = (items: readonly ReviewPredictionListItemDto[]): string | undefined => {
	const id = items[0]?.prediction.id;
	return id == null ? undefined : normalizeReviewPredictionId(id);
};

export const hasReviewPredictionId = (
	items: readonly ReviewPredictionListItemDto[],
	predictionId: string,
): boolean => items.some((item) => normalizeReviewPredictionId(item.prediction.id) === predictionId);
