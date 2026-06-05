import { Share2 } from "lucide-react";
import { useState } from "react";
import { AppButton } from "../../app/components/ui-controls";
import type { PredictionDto, SignatureDto } from "../api/modelService";
import { ReviewLinkDialog } from "./ReviewLinkDialog";

type ReviewLinkButtonProps = {
  modelId: string;
  signature: SignatureDto;
  predictions: PredictionDto[];
  statusByPredictionId: Map<string, "COMPLETED" | "PENDING">;
};

export function ReviewLinkButton(props: ReviewLinkButtonProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <AppButton type="button" variant="secondary" onClick={() => setOpen(true)}>
        <Share2 size={16} />
        Share
      </AppButton>
      <ReviewLinkDialog {...props} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
