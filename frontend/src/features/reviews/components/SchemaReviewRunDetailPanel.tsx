import { useMemo, useState } from "react";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppSkeletonScope } from "@/shared/ui/AppSkeletonScope";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { ReviewAccordionSection } from "@/features/reviews/components/ReviewAccordionSection";
import { ReviewInputsSection } from "@/features/reviews/components/ReviewInputsSection";
import { ReviewOutputsSection } from "@/features/reviews/components/ReviewOutputsSection";
import { getVisibleSchemaInputRecord } from "@/capabilities/prediction-runtime/data/input-display";
import { useSchemaReviewRun } from "@/features/reviews/api/review-queries";
import { SchemaReviewCombinedFeedbackForm } from "./SchemaReviewCombinedFeedbackForm";
import { questionnaireConfigError } from "@/capabilities/prediction-runtime/feedback/questionnaire-config";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  reviewId: string;
  reviewRunId: string;
  version: SchemaVersionDto;
  onReviewChanged: () => unknown;
};

export function SchemaReviewRunDetailPanel({
  reviewId,
  reviewRunId,
  version,
  onReviewChanged,
}: Props) {
  const detail = useSchemaReviewRun(reviewId, reviewRunId);
  const showLoading = useStableLoading(detail.isLoading);
  // The previous inference stays as the skeleton's shape; its form and sections never mix
  // with the newly selected review run, so only the shell is drawn while switching.
  const switching = detail.isPlaceholderData;
  const [outputsOpen, setOutputsOpen] = useState(false);
  const [inputsOpen, setInputsOpen] = useState(false);
  const visibleInputs = useMemo(
    () =>
      detail.data ? getVisibleSchemaInputRecord(version.formSchema, detail.data.run.inputData) : {},
    [detail.data, version.formSchema],
  );
  if (showLoading) return <AppLoadingState compact label="Loading inference…" />;
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
    <AppSkeletonScope className="space-y-6" label="Loading inference…" loading={switching}>
      <h2 className="text-2xl font-semibold text-fg">{detail.data.run.name}</h2>
      {switching ? (
        <AppLoadingState label="Loading review form…" rows={1} />
      ) : (
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
      )}
      <ReviewAccordionSection
        title="Outputs"
        open={outputsOpen}
        onToggle={() => setOutputsOpen((current) => !current)}
      >
        {switching ? null : (
          <ReviewOutputsSection version={version} results={detail.data.run.results} />
        )}
      </ReviewAccordionSection>
      <ReviewAccordionSection
        title="Inputs"
        open={inputsOpen}
        onToggle={() => setInputsOpen((current) => !current)}
      >
        {switching ? null : <ReviewInputsSection inputs={visibleInputs} />}
      </ReviewAccordionSection>
    </AppSkeletonScope>
  );
}
