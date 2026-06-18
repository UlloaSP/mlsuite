import { Share2 } from "lucide-react";
import { useState } from "react";
import { AppButton } from "../../app/components";
import type { PredictionRunDto, SchemaVersionDto } from "../../api/schemas/dtos";
import { SchemaRunReviewLinkDialog } from "./SchemaRunReviewLinkDialog";

type Props = {
  runs: PredictionRunDto[];
  version: SchemaVersionDto;
};

export function SchemaRunShareButton({ runs, version }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppButton
        type="button"
        variant="secondary"
        disabled={runs.length === 0}
        onClick={() => setOpen(true)}
      >
        <Share2 size={16} />
        Share
      </AppButton>
      {open ? (
        <SchemaRunReviewLinkDialog runs={runs} version={version} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}
