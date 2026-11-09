import { useState } from "react";
import { toast } from "@/shared/ui/toast";
import {
  useDeleteInferenceMutation,
  useDeleteInferencesMutation,
} from "@/features/inferences/api/inference-mutations";
import type { InferenceTableRow } from "@/features/inferences/lib/inference-table-rows";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

const DELETE_CONSEQUENCE =
  "Each leaves any review it is in, and goes with its results and reviewers' answers. This cannot be undone.";

/**
 * Deleting inferences: one from its row's menu, or the rows the member ticked. Only ticked rows
 * still listed count, so a changed search or filter never deletes what is no longer on screen.
 * Render `dialog` once.
 */
export function useInferenceDeletion(rows: readonly InferenceTableRow[]) {
  const deleteOne = useDeleteInferenceMutation();
  const deleteMany = useDeleteInferencesMutation();
  const { confirm, dialog } = useActionDialog();
  const [ticked, setTicked] = useState<ReadonlySet<number>>(() => new Set());
  const selected = rows.filter((row) => ticked.has(row.item.id)).map((row) => row.item);

  const toggle = (id: number) =>
    setTicked((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const remove = async (item: PredictionRunCatalogItemDto) => {
    const confirmed = await confirm({
      title: `Delete ${item.name}?`,
      description: DELETE_CONSEQUENCE,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteOne.mutate(item.id, { onSuccess: () => toast.success("Inference deleted.") });
  };

  const removeSelected = async () => {
    const ids = selected.map((item) => item.id);
    const confirmed = await confirm({
      title: `Delete ${ids.length} selected ${ids.length === 1 ? "inference" : "inferences"}?`,
      description: DELETE_CONSEQUENCE,
      confirmLabel: "Delete",
      danger: true,
    });
    if (!confirmed) return;
    deleteMany.mutate(ids, {
      onSuccess: () => {
        setTicked(new Set());
        toast.success(`${ids.length} deleted.`);
      },
    });
  };

  return {
    dialog,
    selected,
    isTicked: (id: number) => ticked.has(id),
    toggle,
    remove,
    removeSelected,
    removingOne: deleteOne.isPending,
    removingSelected: deleteMany.isPending,
  };
}
