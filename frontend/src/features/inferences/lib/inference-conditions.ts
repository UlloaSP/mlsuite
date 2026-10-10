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

export const isCompleteCondition = (condition: InferenceCondition) =>
  Boolean(condition.columnId) && (!needsValue(condition.operator) || condition.value.trim() !== "");

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
