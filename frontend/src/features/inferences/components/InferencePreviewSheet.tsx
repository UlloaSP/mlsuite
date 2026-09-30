import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { AppDialog } from "@/shared/ui/AppDialog";
import { appButtonClass } from "@/shared/ui/button-styles";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import type { PredictionRunCatalogItemDto } from "@/shared/api/openapi.gen";

/** A row's inputs and outputs beside the table; its full page keeps reviews and actions. */
export function InferencePreviewSheet({
  item,
  onClose,
  children,
}: {
  item: PredictionRunCatalogItemDto;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <AppDialog
      open
      variant="sheet"
      onClose={onClose}
      title={item.name}
      description={`${item.schemaName} · ${snapshotLabel(item.schemaVersionName, item.schemaVersion)}`}
      bodyClassName="flex flex-col gap-4"
      footer={
        <Link to={`/inferences/${item.id}`} className={appButtonClass({ variant: "secondary" })}>
          <ExternalLink size={16} />
          Open inference
        </Link>
      }
    >
      {children}
    </AppDialog>
  );
}
