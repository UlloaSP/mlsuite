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
  const [snapshot, setSnapshot] = useState<InferenceExportCandidate[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const show = async () => {
    setLoading(true);
    setError(false);
    try {
      setSnapshot(await loadItems());
      setOpen(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <AppButton
        type="button"
        variant="secondary"
        disabled={loading || count === 0}
        onClick={() => void show()}
      >
        <FileDown size={16} />
        {loading ? "Preparing selection…" : "Export to CSV"}
      </AppButton>
      {error ? (
        <span role="alert" className="text-sm text-danger-fg">
          Could not load export selection. Try again.
        </span>
      ) : null}
      {open && snapshot ? (
        <OrganizationInferenceExportDialog items={snapshot} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
