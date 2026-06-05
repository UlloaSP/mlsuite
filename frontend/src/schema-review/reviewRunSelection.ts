import type { SchemaReviewRunListItemDto } from "./api/schemaReviewLinkService";

export const reviewRunToken = (item: SchemaReviewRunListItemDto): string => item.selectionToken;

export const firstReviewRunToken = (
  items: readonly SchemaReviewRunListItemDto[],
): string | undefined => items[0]?.selectionToken;

export const hasReviewRunToken = (
  items: readonly SchemaReviewRunListItemDto[],
  token: string,
): boolean => items.some((item) => item.selectionToken === token);
