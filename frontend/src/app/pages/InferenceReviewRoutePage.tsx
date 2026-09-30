import { REVIEW_POLL_MS } from "@/features/inferences/api/inference-api";
import { InferenceReviewPage } from "@/features/inferences/pages/inference-review-page";
import { ReviewerFeedbackAnswers } from "@/features/schemas/components/ReviewerFeedbackAnswers";

/** A reviewer's assignment page, with their answers from the schemas feature. */
export function InferenceReviewRoutePage() {
  return (
    <InferenceReviewPage
      renderAnswers={(inferenceId, reviewerId) => (
        <ReviewerFeedbackAnswers
          runId={inferenceId}
          reviewerId={reviewerId}
          pollMs={REVIEW_POLL_MS}
        />
      )}
    />
  );
}
