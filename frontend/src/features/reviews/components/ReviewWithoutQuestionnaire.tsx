import { useState } from "react";
import { toast } from "sonner";
import { AppButton } from "@/shared/ui/AppButton";
import { AppCopy } from "@/shared/ui/AppCopy";
import { submitSchemaReviewRuns } from "@/features/reviews/api/review-api";

export function ReviewWithoutQuestionnaire({
  reviewId,
  reviewRunId,
  onCompleted,
}: {
  reviewId: string;
  reviewRunId: string;
  onCompleted: () => unknown;
}) {
  const [submitting, setSubmitting] = useState(false);
  const complete = async () => {
    setSubmitting(true);
    try {
      await submitSchemaReviewRuns(reviewId, [reviewRunId]);
      await onCompleted();
      toast.success("Review completed");
    } catch (error) {
      toast.error("Review could not be completed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <section className="space-y-3">
      <AppCopy>
        No feedback questionnaire configured. Inspect the inputs and outputs, then complete this
        review.
      </AppCopy>
      <AppButton disabled={submitting} onClick={() => void complete()}>
        {submitting ? "Completing review..." : "Complete this review"}
      </AppButton>
    </section>
  );
}
