import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { useCompleteSchemaReviewRunMutation } from "@/features/reviews/api/review-mutations";

export function ReviewWithoutQuestionnaire({
  reviewId,
  reviewRunId,
  onCompleted,
}: {
  reviewId: string;
  reviewRunId: string;
  onCompleted: () => unknown;
}) {
  const { mutateAsync: completeRun } = useCompleteSchemaReviewRunMutation(reviewId, reviewRunId);
  // Held until the page has read the completed item too, so the action cannot be sent twice.
  const [submitting, setSubmitting] = useState(false);
  const complete = () => {
    setSubmitting(true);
    void completeRun()
      .then(() => onCompleted())
      .then(
        () => toast.success("Review completed"),
        (error: unknown) =>
          toast.error("Review could not be completed", {
            description: error instanceof Error ? error.message : String(error),
          }),
      )
      .finally(() => setSubmitting(false));
  };
  return (
    <section className="space-y-3">
      <AppCopy>
        No feedback questionnaire configured. Inspect the inputs and outputs, then complete this
        review.
      </AppCopy>
      <AppButton disabled={submitting} onClick={complete}>
        {submitting ? "Completing review…" : "Complete this review"}
      </AppButton>
    </section>
  );
}
