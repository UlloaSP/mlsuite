import type { SchemaReviewRunListItemDto } from "../../../schema-review/api/schemaReviewLinkService";

/**
 * reviewRunToken: performs the exported transformation for this algorithm.
 *
 * Purpose: normalizes schema review run selection tokens.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const reviewRunToken = (item: SchemaReviewRunListItemDto): string => item.selectionToken;

/**
 * firstReviewRunToken: performs the exported transformation for this algorithm.
 *
 * Purpose: normalizes schema review run selection tokens.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const firstReviewRunToken = (
  items: readonly SchemaReviewRunListItemDto[],
): string | undefined => items[0]?.selectionToken;

/**
 * hasReviewRunToken: returns whether the requested condition exists
 *
 * Purpose: normalizes schema review run selection tokens.
 * @returns Boolean result for the domain predicate.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const hasReviewRunToken = (
  items: readonly SchemaReviewRunListItemDto[],
  token: string,
): boolean => items.some((item) => item.selectionToken === token);
