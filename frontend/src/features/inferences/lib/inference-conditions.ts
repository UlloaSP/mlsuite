import {
  formatInferenceCell,
  type InferenceTableRow,
} from "@/features/inferences/lib/inference-table-rows";

export type ConditionOperator =
  | "is"
  | "contains"
  | "eq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "empty"
  | "notEmpty";

/** One column condition, e.g. age > 40 or prediction is "Yes". */
export type InferenceCondition = { columnId: string; operator: ConditionOperator; value: string };

export type ColumnKind = "number" | "text";

export const OPERATORS: Record<ColumnKind, Array<{ value: ConditionOperator; label: string }>> = {
  number: [
    { value: "eq", label: "=" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "empty", label: "is empty" },
    { value: "notEmpty", label: "is not empty" },
  ],
  text: [
    { value: "is", label: "is" },
    { value: "contains", label: "contains" },
    { value: "empty", label: "is empty" },
    { value: "notEmpty", label: "is not empty" },
  ],
};

const ALL_OPERATORS = new Set<string>(
  Object.values(OPERATORS).flatMap((list) => list.map((item) => item.value)),
);

export const needsValue = (operator: ConditionOperator) =>
  operator !== "empty" && operator !== "notEmpty";

const asNumber = (value: unknown): number =>
  typeof value === "number"
    ? value
    : typeof value === "string" && value.trim()
      ? Number(value)
      : NaN;

/** Numeric when every value the rows hold for the column is a number. */
export const columnKind = (rows: readonly InferenceTableRow[], columnId: string): ColumnKind => {
  const values = rows.map((row) => row.values.get(columnId)).filter((value) => value !== undefined);
  return values.length > 0 && values.every((value) => Number.isFinite(asNumber(value)))
    ? "number"
    : "text";
};

/** The values shown in a column, for choosing one instead of typing it. */
export const distinctColumnValues = (rows: readonly InferenceTableRow[], columnId: string) =>
  [
    ...new Set(rows.map((row) => formatInferenceCell(row.values.get(columnId))).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

export const isCompleteCondition = (condition: InferenceCondition) =>
  Boolean(condition.columnId) && (!needsValue(condition.operator) || condition.value.trim() !== "");

export const matchesCondition = (row: InferenceTableRow, condition: InferenceCondition) => {
  const raw = row.values.get(condition.columnId);
  const text = formatInferenceCell(raw);
  switch (condition.operator) {
    case "empty":
      return !text;
    case "notEmpty":
      return Boolean(text);
    case "is":
      return text === condition.value;
    case "contains":
      return text.toLowerCase().includes(condition.value.trim().toLowerCase());
  }
  const left = asNumber(raw);
  const right = asNumber(condition.value);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  switch (condition.operator) {
    case "eq":
      return left === right;
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lt":
      return left < right;
    case "lte":
      return left <= right;
  }
};

/** Conditions travel in the URL as JSON tuples; anything malformed is dropped. */
export const parseConditions = (value: string): InferenceCondition[] => {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): InferenceCondition[] =>
      Array.isArray(entry) &&
      entry.length === 3 &&
      entry.every((part) => typeof part === "string") &&
      ALL_OPERATORS.has(entry[1])
        ? [{ columnId: entry[0], operator: entry[1] as ConditionOperator, value: entry[2] }]
        : [],
    );
  } catch {
    return [];
  }
};

export const serializeConditions = (conditions: readonly InferenceCondition[]) =>
  conditions.length
    ? JSON.stringify(conditions.map(({ columnId, operator, value }) => [columnId, operator, value]))
    : "";
