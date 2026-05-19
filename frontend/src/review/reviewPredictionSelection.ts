import type { ReviewPredictionListItemDto } from "./api/reviewLinkService";

export const reviewSelectionToken = (item: ReviewPredictionListItemDto): string => item.selectionToken;

export const firstReviewPredictionToken = (items: readonly ReviewPredictionListItemDto[]): string | undefined => {
	return items[0]?.selectionToken;
};

export const hasReviewPredictionToken = (
	items: readonly ReviewPredictionListItemDto[],
	predictionToken: string,
): boolean => items.some((item) => item.selectionToken === predictionToken);
