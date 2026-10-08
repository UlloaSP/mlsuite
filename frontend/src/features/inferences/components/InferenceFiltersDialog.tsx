import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { InferenceConditionRow } from "@/features/inferences/components/InferenceConditionRow";
import {
  isCompleteCondition,
  type InferenceCondition,
} from "@/features/inferences/lib/inference-conditions";
import { scopeInferences, type InferenceFilters } from "@/features/inferences/lib/inference-filter";
import {
  inferenceDataColumns,
  type InferenceTableRow,
} from "@/features/inferences/lib/inference-table-rows";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppFieldLabel } from "@/shared/ui/AppFieldLabel";
import { AppSelect } from "@/shared/ui/AppSelect";

export type InferenceFilterChoice = Omit<InferenceFilters, "query">;

const CLEARED: InferenceFilterChoice = {
  schemaId: "all",
  bookmarkId: "all",
  status: "all",
  feedback: "all",
  origin: "all",
  conditions: [],
};

const EMPTY_CONDITION: InferenceCondition = { columnId: "", operator: "is", value: "" };

const uniqueOptions = (items: Array<{ value: string; label: string }>) =>
  [...new Map(items.map((item) => [item.value, item])).values()].sort((a, b) =>
    a.label.localeCompare(b.label),
  );

type Props = {
  filters: InferenceFilterChoice;
  rows: readonly InferenceTableRow[];
  onApply: (filters: InferenceFilterChoice) => void;
  onClose: () => void;
};

/** Every filter in one place, edited as a draft and applied together. */
export function InferenceFiltersDialog({ filters, rows, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<InferenceFilterChoice>(filters);
  const scoped = useMemo(() => scopeInferences(rows, draft), [rows, draft]);
  const columns = useMemo(() => inferenceDataColumns(scoped), [scoped]);
  const schemaOptions = uniqueOptions(
    rows.map(({ item }) => ({ value: String(item.schemaId), label: item.schemaName })),
  );
  const bookmarkOptions = uniqueOptions(
    scopeInferences(rows, { schemaId: draft.schemaId, bookmarkId: "all" }).flatMap(({ item }) =>
      item.bookmarkId == null
        ? []
        : [{ value: String(item.bookmarkId), label: item.bookmarkName ?? "Bookmark" }],
    ),
  );
  const set = (changes: Partial<InferenceFilterChoice>) =>
    setDraft((current) => {
      const next = { ...current, ...changes };
      if (changes.schemaId !== undefined || changes.bookmarkId !== undefined) {
        const available = new Set(
          inferenceDataColumns(scopeInferences(rows, next)).map((column) => column.id),
        );
        next.conditions = next.conditions.filter((condition) => available.has(condition.columnId));
      }
      return next;
    });
  const setCondition = (index: number, condition?: InferenceCondition) =>
    set({
      conditions: condition
        ? draft.conditions.map((item, position) => (position === index ? condition : item))
        : draft.conditions.filter((_, position) => position !== index),
    });

  return (
    <AppDialog
      open
      size="lg"
      title="Filters"
      description="Narrow the table by inference details and by any column's values."
      onClose={onClose}
      onSubmit={(event) => {
        event.preventDefault();
        onApply({ ...draft, conditions: draft.conditions.filter(isCompleteCondition) });
      }}
      footer={
        <>
          <AppButton variant="ghost" className="mr-auto" onClick={() => setDraft(CLEARED)}>
            Clear all
          </AppButton>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit">Apply filters</AppButton>
        </>
      }
    >
      <section className="grid gap-4 sm:grid-cols-2">
        <AppFieldLabel label="Schema">
          <AppSelect
            value={draft.schemaId}
            className="w-full"
            // Bookmarks belong to one schema, so a schema change clears the bookmark filter.
            onValueChange={(schemaId) => set({ schemaId, bookmarkId: "all" })}
            options={[{ value: "all", label: "All schemas" }, ...schemaOptions]}
          />
        </AppFieldLabel>
        <AppFieldLabel label="Bookmark">
          <AppSelect
            value={draft.bookmarkId}
            className="w-full"
            onValueChange={(bookmarkId) => set({ bookmarkId })}
            options={[
              { value: "all", label: "All bookmarks" },
              { value: "unbookmarked", label: "Without bookmark" },
              ...bookmarkOptions,
            ]}
          />
        </AppFieldLabel>
        <AppFieldLabel label="Inference status">
          <AppSelect
            value={draft.status}
            className="w-full"
            onValueChange={(status) => set({ status: status as InferenceFilters["status"] })}
            options={[
              { value: "all", label: "All statuses" },
              { value: "SUCCESS", label: "Success" },
              { value: "PARTIAL_SUCCESS", label: "Partial success" },
              { value: "FAILED", label: "Failed" },
            ]}
          />
        </AppFieldLabel>
        <AppFieldLabel label="Feedback">
          <AppSelect
            value={draft.feedback}
            className="w-full"
            onValueChange={(feedback) =>
              set({ feedback: feedback as InferenceFilters["feedback"] })
            }
            options={[
              { value: "all", label: "All feedback" },
              { value: "COMPLETED", label: "Completed" },
              { value: "PENDING", label: "Pending" },
              { value: "NOT_REQUIRED", label: "Not configured" },
            ]}
          />
        </AppFieldLabel>
        <AppFieldLabel label="Origin">
          <AppSelect
            value={draft.origin}
            className="w-full"
            onValueChange={(origin) => set({ origin: origin as InferenceFilters["origin"] })}
            options={[
              { value: "all", label: "All origins" },
              { value: "WORKSPACE", label: "Workspace" },
              { value: "PUBLIC", label: "Public page" },
            ]}
          />
        </AppFieldLabel>
      </section>
      <section className="mt-6 grid gap-3 border-t border-line pt-5">
        <div>
          <h3 className="text-sm font-semibold text-fg">Column conditions</h3>
          <p className="mt-1 text-sm text-fg-secondary">
            Every condition must match. Inputs, outputs and each reviewer's answers can be used.
          </p>
        </div>
        {draft.conditions.map((condition, index) => (
          <InferenceConditionRow
            // Conditions have no identity of their own; position is stable while editing.
            key={index}
            condition={condition}
            columns={columns}
            rows={scoped}
            onChange={(next) => setCondition(index, next)}
            onRemove={() => setCondition(index)}
          />
        ))}
        <AppButton
          variant="secondary"
          size="sm"
          className="justify-self-start"
          disabled={columns.length === 0}
          onClick={() => set({ conditions: [...draft.conditions, EMPTY_CONDITION] })}
        >
          <Plus size={15} />
          Add condition
        </AppButton>
      </section>
    </AppDialog>
  );
}
