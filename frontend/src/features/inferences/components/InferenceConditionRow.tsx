import { X } from "lucide-react";
import {
  needsValue,
  OPERATORS,
  type ConditionOperator,
  type InferenceCondition,
} from "@/features/inferences/lib/inference-conditions";
import type { InferenceCatalogColumnDto } from "@/shared/api/openapi.gen";
import { InferenceFacetSelect } from "./InferenceFacetSelect";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppTooltip } from "@/shared/ui/AppTooltip";

// Beyond this many distinct values a list stops helping; the value is typed instead.
const MAX_LISTED_VALUES = 50;

type Props = {
  condition: InferenceCondition;
  columns: readonly InferenceCatalogColumnDto[];
  schemaId: string;
  bookmarkId: string;
  onChange: (condition: InferenceCondition) => void;
  onRemove: () => void;
};

/** Column, operator, and value: the operators follow the column's values (numbers or text). */
export function InferenceConditionRow({
  condition,
  columns,
  schemaId,
  bookmarkId,
  onChange,
  onRemove,
}: Props) {
  const index = columns.findIndex((column) => column.id === condition.columnId);
  const kind = columns[index]?.kind ?? "text";
  const choices =
    kind === "text" && condition.operator === "is" ? (columns[index]?.choices ?? []) : [];

  return (
    <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1.5fr)_9rem_minmax(0,1fr)_auto]">
      <InferenceFacetSelect
        kind="columns"
        schemaId={schemaId}
        bookmarkId={bookmarkId}
        value={condition.columnId}
        label="Choose a column…"
        selectedLabel={columns[index]?.label}
        onChange={(id) => {
          const column = columns.find((item) => item.id === id);
          if (!column) return;
          const operator = OPERATORS[column.kind][0]!.value;
          onChange({ columnId: column.id, operator, value: "" });
        }}
      />
      <AppSelect
        aria-label="Operator"
        value={condition.operator}
        disabled={!condition.columnId}
        options={OPERATORS[kind]}
        onValueChange={(value) => {
          const operator = value as ConditionOperator;
          onChange({ ...condition, operator, value: needsValue(operator) ? condition.value : "" });
        }}
      />
      {!needsValue(condition.operator) ? (
        <span aria-hidden="true" />
      ) : choices.length > 0 && choices.length <= MAX_LISTED_VALUES ? (
        <AppSelect
          aria-label="Value"
          placeholder="Choose a value"
          value={condition.value}
          options={choices.map((choice) => ({ value: choice, label: choice }))}
          onValueChange={(value) => onChange({ ...condition, value })}
        />
      ) : (
        <AppTextField
          aria-label="Value"
          type={kind === "number" ? "number" : "text"}
          placeholder="Value"
          disabled={!condition.columnId}
          value={condition.value}
          onChange={(event) => onChange({ ...condition, value: event.target.value })}
        />
      )}
      <AppTooltip label="Remove condition" side="top">
        <AppIconButton aria-label="Remove condition" onClick={onRemove}>
          <X size={16} />
        </AppIconButton>
      </AppTooltip>
    </div>
  );
}
