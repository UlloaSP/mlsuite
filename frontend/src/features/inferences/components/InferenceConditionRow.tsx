import { X } from "lucide-react";
import {
  columnKind,
  distinctColumnValues,
  needsValue,
  OPERATORS,
  type ConditionOperator,
  type InferenceCondition,
} from "@/features/inferences/lib/inference-conditions";
import { dataGroupLabel } from "@/features/inferences/lib/inference-table-columns";
import type {
  InferenceDataColumn,
  InferenceTableRow,
} from "@/features/inferences/lib/inference-table-rows";
import { AppCombobox } from "@/shared/ui/AppCombobox";
import { AppIconButton } from "@/shared/ui/AppIconButton";
import { AppSelect } from "@/shared/ui/AppSelect";
import { AppTextField } from "@/shared/ui/AppTextField";
import { AppTooltip } from "@/shared/ui/AppTooltip";

// Beyond this many distinct values a list stops helping; the value is typed instead.
const MAX_LISTED_VALUES = 50;

type Props = {
  condition: InferenceCondition;
  columns: readonly InferenceDataColumn[];
  /** The rows in the dialog's schema and bookmark scope, for value types and choices. */
  rows: readonly InferenceTableRow[];
  onChange: (condition: InferenceCondition) => void;
  onRemove: () => void;
};

/** Column, operator, and value: the operators follow the column's values (numbers or text). */
export function InferenceConditionRow({ condition, columns, rows, onChange, onRemove }: Props) {
  const index = columns.findIndex((column) => column.id === condition.columnId);
  const kind = condition.columnId ? columnKind(rows, condition.columnId) : "text";
  const choices =
    kind === "text" && condition.operator === "is"
      ? distinctColumnValues(rows, condition.columnId)
      : [];

  return (
    <div className="grid items-center gap-2 sm:grid-cols-[minmax(0,1.5fr)_9rem_minmax(0,1fr)_auto]">
      <AppCombobox
        value={index >= 0 ? index : null}
        placeholder="Choose a column…"
        items={columns.map((column, position) => ({
          id: position,
          label: column.label,
          description: dataGroupLabel(column, true),
        }))}
        onChange={(item) => {
          const column = item ? columns[item.id] : undefined;
          if (!column) return;
          const operator = OPERATORS[columnKind(rows, column.id)][0]!.value;
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
