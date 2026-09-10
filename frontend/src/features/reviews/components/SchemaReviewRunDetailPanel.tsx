import { useMemo, useState } from "react";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { ReviewAccordionSection } from "@/features/reviews/components/ReviewAccordionSection";
import { ReviewInputsSection } from "@/features/reviews/components/ReviewInputsSection";
import { ReviewOutputsSection } from "@/features/reviews/components/ReviewOutputsSection";
import { getVisibleSchemaInputRecord } from "@/capabilities/prediction-runtime/data/input-display";
import { useSchemaReviewRun } from "@/features/reviews/api/review-queries";
import type { ReviewSchemaVersionDto } from "@/features/reviews/api/review-types";
import { SchemaReviewCombinedFeedbackForm } from "./SchemaReviewCombinedFeedbackForm";
import { questionnaireConfigError } from "@/capabilities/prediction-runtime/feedback/questionnaire-config";

type Props = {
  reviewId: string;
  reviewRunId: string;
  version: ReviewSchemaVersionDto;
  onReviewChanged: () => unknown;
};

export function SchemaReviewRunDetailPanel({
  reviewId,
  reviewRunId,
  version,
  onReviewChanged,
}: Props) {
  const detail = useSchemaReviewRun(reviewId, reviewRunId);
  const [outputsOpen, setOutputsOpen] = useState(false);
  const [inputsOpen, setInputsOpen] = useState(false);
  const visibleInputs = useMemo(
    () =>
      detail.data ? getVisibleSchemaInputRecord(version.formSchema, detail.data.run.inputData) : {},
    [detail.data, version.formSchema],
  );
  if (detail.isLoading)
    return <p className="text-sm text-[var(--text-secondary)]">Loading inference</p>;
  if (detail.error || !detail.data) {
    return (
      <AppEmptyState
        title="Inference unavailable"
        description="This inference cannot be opened from this review."
      />
    );
  }
  const configurationError = questionnaireConfigError(version.formSchema);
  if (configurationError)
    return (
      <AppEmptyState title="Invalid feedback questionnaire" description={configurationError} />
    );
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
          Selected inference
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          {detail.data.run.name}
        </h2>
      </div>
      <SchemaReviewCombinedFeedbackForm
        key={reviewRunId}
        reviewId={reviewId}
        reviewRunId={reviewRunId}
        run={detail.data.run}
        version={version}
        feedback={detail.data.feedback}
        onSaved={async () => {
          await detail.refetch();
          await onReviewChanged();
        }}
      />
      <ReviewAccordionSection
        title="Outputs"
        open={outputsOpen}
        onToggle={() => setOutputsOpen((current) => !current)}
      >
        <ReviewOutputsSection version={version} results={detail.data.run.results} />
      </ReviewAccordionSection>
      <ReviewAccordionSection
        title="Inputs"
        open={inputsOpen}
        onToggle={() => setInputsOpen((current) => !current)}
      >
        <ReviewInputsSection inputs={visibleInputs} />
      </ReviewAccordionSection>
    </div>
  );
}
