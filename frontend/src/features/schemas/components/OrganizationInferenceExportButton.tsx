import { FileDown } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import { OrganizationInferenceExportDialog } from "./OrganizationInferenceExportDialog";

export type InferenceExportCandidate = {
  id: number;
  name: string;
  createdAt: string;
  schemaId: number;
  schemaName: string;
  schemaVersionId: number;
  schemaVersionName: string;
  schemaVersion: number;
  bookmarkId?: number | null;
  bookmarkName?: string | null;
};

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
