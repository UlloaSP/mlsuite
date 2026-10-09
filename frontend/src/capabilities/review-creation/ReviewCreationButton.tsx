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
  const [snapshot, setSnapshot] = useState<ReviewCandidate[]>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const show = async () => {
    setLoading(true);
    setError(false);
    try {
      setSnapshot(await loadCandidates());
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
        variant={variant}
        disabled={loading || count === 0}
        onClick={() => void show()}
      >
        <ClipboardCheck size={16} />
        {loading ? "Preparing review…" : "Create review"}
      </AppButton>
      {error ? (
        <span role="alert" className="text-sm text-danger-fg">
          Could not load review selection. Try again.
        </span>
      ) : null}
      {open && snapshot ? (
        <ReviewCreationDialog
          candidates={snapshot}
          organizationId={organizationId}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}
