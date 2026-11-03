import { useMutation } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";
import { OrganizationInferenceExportDialog } from "./OrganizationInferenceExportDialog";

export type InferenceExportCandidate = Pick<
  PredictionRunCatalogItemDto,
  | "id"
  | "name"
  | "createdAt"
  | "schemaId"
  | "schemaName"
  | "schemaVersionId"
  | "schemaVersionName"
  | "schemaVersion"
  | "bookmarkId"
  | "bookmarkName"
>;

export function OrganizationInferenceExportButton({
  count,
  loadItems,
}: {
  /** How many inferences the whole server result holds. */
  count: number;
  /** The complete result, fetched when the dialog opens: never only the loaded pages. */
  loadItems: () => Promise<InferenceExportCandidate[]>;
}) {
  const [open, setOpen] = useState(false);
  const selection = useMutation({
    mutationFn: loadItems,
    onSuccess: () => setOpen(true),
    meta: { errorHandledLocally: true },
  });
  return (
    <>
      <AppButton
        type="button"
        variant="secondary"
        disabled={selection.isPending || count === 0}
        onClick={() => selection.mutate()}
      >
        <FileDown size={16} />
        {selection.isPending ? "Preparing selection…" : "Export to CSV"}
      </AppButton>
      {selection.isError ? (
        <span role="alert" className="text-sm text-danger-fg">
          Could not load export selection. Try again.
        </span>
      ) : null}
      {open && selection.data ? (
        <OrganizationInferenceExportDialog items={selection.data} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
