import { Plus } from "lucide-react";
import { useState } from "react";
import { InferenceConditionRow } from "@/features/inferences/components/InferenceConditionRow";
import { InferenceFacetSelect } from "@/features/inferences/components/InferenceFacetSelect";
import {
  isCompleteCondition,
  type InferenceCondition,
} from "@/features/inferences/lib/inference-conditions";
import { type InferenceFilters } from "@/features/inferences/lib/inference-filter";
import { useInferenceCatalogMetadata } from "@/features/inferences/api/inference-catalog";
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

type Props = {
  filters: InferenceFilterChoice;
  onApply: (filters: InferenceFilterChoice) => void;
  onClose: () => void;
};

/** Every filter in one place, edited as a draft and applied together. */
export function InferenceFiltersDialog({ filters, onApply, onClose }: Props) {
  const [draft, setDraft] = useState<InferenceFilterChoice>(filters);
  const metadata = useInferenceCatalogMetadata(draft.schemaId, draft.bookmarkId);
  const columns = metadata.data?.columns ?? [];
  const schemaOptions = [
    { id: "all", label: "All schemas" },
    ...(metadata.data?.schemas ?? []).map((option) => ({ id: option.value, label: option.label })),
  ];
  const bookmarkOptions = [
    { id: "all", label: "All bookmarks" },
    { id: "unbookmarked", label: "Without bookmark" },
    ...(metadata.data?.bookmarks ?? []).map((option) => ({
      id: option.value,
      label: option.label,
    })),
  ];
  const set = (changes: Partial<InferenceFilterChoice>) =>
    setDraft((current) => ({ ...current, ...changes }));
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
        if (!metadata.isSuccess || metadata.isPlaceholderData) return;
        onApply({
          ...draft,
          conditions: draft.conditions.filter(
            (condition) =>
              isCompleteCondition(condition) &&
              columns.some((column) => column.id === condition.columnId),
          ),
        });
      }}
      footer={
        <>
          <AppButton variant="ghost" className="mr-auto" onClick={() => setDraft(CLEARED)}>
            Clear all
          </AppButton>
          <AppButton variant="secondary" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton type="submit" disabled={!metadata.isSuccess || metadata.isPlaceholderData}>
            Apply filters
          </AppButton>
        </>
      }
    >
      {metadata.error ? (
        <p role="alert">
          Could not load filters.{" "}
          <AppButton variant="secondary" onClick={() => void metadata.refetch()}>
            Retry
          </AppButton>
        </p>
      ) : null}
      <section className="grid gap-4 sm:grid-cols-2">
        <AppFieldLabel label="Schema">
          <InferenceFacetSelect
            kind="schemas"
            schemaId={draft.schemaId}
            bookmarkId={draft.bookmarkId}
            label="Schema"
            value={draft.schemaId}
            selectedLabel={schemaOptions.find((item) => item.id === draft.schemaId)?.label}
            staticOptions={[{ id: "all", label: "All schemas" }]}
            // Bookmarks belong to one schema, so a schema change clears the bookmark filter.
            onChange={(schemaId) => set({ schemaId, bookmarkId: "all" })}
          />
        </AppFieldLabel>
        <AppFieldLabel label="Bookmark">
          <InferenceFacetSelect
            kind="bookmarks"
            schemaId={draft.schemaId}
            bookmarkId={draft.bookmarkId}
            label="Bookmark"
            value={draft.bookmarkId}
            selectedLabel={bookmarkOptions.find((item) => item.id === draft.bookmarkId)?.label}
            staticOptions={[
              { id: "all", label: "All bookmarks" },
              { id: "unbookmarked", label: "Without bookmark" },
            ]}
            onChange={(bookmarkId) => set({ bookmarkId })}
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
            schemaId={draft.schemaId}
            bookmarkId={draft.bookmarkId}
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
