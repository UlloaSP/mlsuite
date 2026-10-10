import type { FeedbackStatusDisplay } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";
import { formatDisplayValue } from "@/capabilities/prediction-runtime/data/input-display";
import type {
  InferenceCatalogColumnDto,
  PredictionRunCatalogItemDto,
} from "@/shared/api/openapi.gen";

export type InferenceColumnGroup = InferenceCatalogColumnDto["group"];

/**
 * A column one inference contributes: an input field, a report output, or one reviewer's
 * answer to one feedback question. Ids start with the schema, so equally named fields of
 * different schemas never share a column.
 */
export type InferenceDataColumn = Pick<
  InferenceCatalogColumnDto,
  "id" | "group" | "label" | "schemaId" | "schemaName"
>;

export type InferenceTableRow = {
  item: PredictionRunCatalogItemDto;
  feedbackStatus: FeedbackStatusDisplay;
  /** Values by data column id; a column the run lacks has no entry. */
  values: ReadonlyMap<string, unknown>;
  displayValues?: Record<string, string>;
};

export const formatInferenceCell = (value: unknown): string =>
  value !== undefined && value !== null && !(typeof value === "string" && value.trim() === "")
    ? formatDisplayValue(value)
    : "";
