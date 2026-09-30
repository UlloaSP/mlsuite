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
  items,
}: {
  items: InferenceExportCandidate[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AppButton
        type="button"
        variant="secondary"
        disabled={!items.length}
        onClick={() => setOpen(true)}
      >
        <FileDown size={16} />
        Export to CSV
      </AppButton>
      {open ? (
        <OrganizationInferenceExportDialog items={items} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
