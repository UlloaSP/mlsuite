import type { InferenceStatus } from "@/features/inferences/api/inference-api";
import type { InferenceCondition } from "./inference-conditions";
import type { SchemaFeedbackStatus } from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

export type InferenceFilters = {
  query: string;
  schemaId: string;
  bookmarkId: string;
  status: "all" | InferenceStatus;
  feedback: "all" | SchemaFeedbackStatus;
  /** Where the run was made: the workspace form, or the bookmark's public page. */
  origin: "all" | PredictionRunCatalogItemDto["origin"];
  conditions: InferenceCondition[];
};

/** How many filters besides the search narrow the table, for the Filters button. */
export const activeFilterCount = (filters: InferenceFilters) =>
  [filters.schemaId, filters.bookmarkId, filters.status, filters.feedback, filters.origin].filter(
    (value) => value !== "all",
  ).length + filters.conditions.length;
