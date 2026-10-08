import type { InferenceStatus } from "@/features/inferences/api/inference-api";
import {
  matchesCondition,
  type InferenceCondition,
} from "@/features/inferences/lib/inference-conditions";
import type { InferenceTableRow } from "@/features/inferences/lib/inference-table-rows";
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

/** Rows of the chosen schema and bookmark: the scope that decides the table's data columns. */
export const scopeInferences = (
  rows: readonly InferenceTableRow[],
  filters: Pick<InferenceFilters, "schemaId" | "bookmarkId">,
) =>
  rows.filter(({ item }) => {
    const matchesSchema = filters.schemaId === "all" || String(item.schemaId) === filters.schemaId;
    const bookmarkValue = item.bookmarkId == null ? "unbookmarked" : String(item.bookmarkId);
    return matchesSchema && (filters.bookmarkId === "all" || bookmarkValue === filters.bookmarkId);
  });

export const filterInferences = (rows: readonly InferenceTableRow[], filters: InferenceFilters) => {
  const query = filters.query.trim().toLowerCase();
  return scopeInferences(rows, filters).filter(
    (row) =>
      (query.length === 0 || row.searchText.includes(query)) &&
      (filters.status === "all" || row.item.status === filters.status) &&
      (filters.feedback === "all" || row.feedbackStatus === filters.feedback) &&
      (filters.origin === "all" || row.item.origin === filters.origin) &&
      filters.conditions.every((condition) => matchesCondition(row, condition)),
  );
};
