import { useMutation } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { AppButton } from "@/shared/ui/AppButton";
import type { ReviewCandidate } from "./review-creation-api";
import { ReviewCreationDialog } from "./ReviewCreationDialog";

type Props = {
  /** How many inferences the whole server result holds. */
  count: number;
  /** The complete result, fetched when the dialog opens: never only the loaded pages. */
  loadCandidates: () => Promise<ReviewCandidate[]>;
  organizationId: number | string;
  variant?: "primary" | "secondary";
};

export function ReviewCreationButton({
  count,
  loadCandidates,
  organizationId,
  variant = "primary",
}: Props) {
  const [open, setOpen] = useState(false);
  const selection = useMutation({
    mutationFn: loadCandidates,
    onSuccess: () => setOpen(true),
    meta: { errorHandledLocally: true },
  });

  return (
    <>
      <AppButton
        type="button"
        variant={variant}
        disabled={selection.isPending || count === 0}
        onClick={() => selection.mutate()}
      >
        <ClipboardCheck size={16} />
        {selection.isPending ? "Preparing review…" : "Create review"}
      </AppButton>
      {selection.isError ? (
        <span role="alert" className="text-sm text-danger-fg">
          Could not load review selection. Try again.
        </span>
      ) : null}
      {open && selection.data ? (
        <ReviewCreationDialog
          candidates={selection.data}
          organizationId={organizationId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
