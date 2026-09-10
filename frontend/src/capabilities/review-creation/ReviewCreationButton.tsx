import { ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import type { ReviewCandidate } from "./review-creation-api";
import { ReviewCreationDialog } from "./ReviewCreationDialog";

type Props = {
  candidates: ReviewCandidate[];
  organizationId: number | string;
  variant?: "primary" | "secondary";
};

export function ReviewCreationButton({ candidates, organizationId, variant = "primary" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <AppButton
        type="button"
        variant={variant}
        disabled={candidates.length === 0}
        onClick={() => setOpen(true)}
      >
        <ClipboardCheck size={16} />
        Create review
      </AppButton>
      {open ? (
        <ReviewCreationDialog
          candidates={candidates}
          organizationId={organizationId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
