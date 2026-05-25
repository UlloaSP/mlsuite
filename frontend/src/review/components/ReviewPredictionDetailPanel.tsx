import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import { themeWithHtmlAtom } from "../../app/atoms";
import { AppEmptyState } from "../../app/components/ui";
import { extractPredictionReportEntries } from "../../models/report-feedback-utils";
import { getOutputReports } from "../../models/report-contract";
import { useReviewPredictionDetail } from "../hooks";
import { ReviewAccordionSection } from "./ReviewAccordionSection";
import { ReviewCombinedFeedbackForm } from "./ReviewCombinedFeedbackForm";
import { ReviewReportsSection } from "./ReviewReportsSection";
import { ReviewInputsSection } from "./ReviewInputsSection";
import { ReviewOutputsSection } from "./ReviewOutputsSection";

type ReviewPredictionDetailPanelProps = {
  token: string;
  predictionToken: string;
  signatureSchema: Record<string, unknown>;
  onReviewChanged: () => Promise<unknown> | unknown;
};

export function ReviewPredictionDetailPanel({
  token,
  predictionToken,
  signatureSchema,
  onReviewChanged,
}: ReviewPredictionDetailPanelProps) {
  const [theme] = useAtom(themeWithHtmlAtom);
  const [inputsOpen, setInputsOpen] = useState(false);
  const [outputsOpen, setOutputsOpen] = useState(false);
  const [reportsOpen, setReportsOpen] = useState(false);
  const detail = useReviewPredictionDetail(token, predictionToken);
  const reports = useMemo(() => {
    return getOutputReports(signatureSchema);
  }, [signatureSchema]);
  const feedbackReports = useMemo(
    () =>
      extractPredictionReportEntries(
        detail.data?.prediction.prediction,
        signatureSchema,
      ),
    [detail.data?.prediction.prediction, signatureSchema],
  );
  const outputByOrder = useMemo(
    () => new Map((detail.data?.outputFeedback ?? []).map((item) => [item.order, item])),
    [detail.data?.outputFeedback],
  );
  const reportFeedbackByOrder = useMemo(
    () => new Map((detail.data?.explanationFeedback ?? []).map((item) => [item.order, item])),
    [detail.data?.explanationFeedback],
  );

  if (detail.isLoading) {
    return <p className="text-sm text-[var(--text-secondary)]">Loading prediction</p>;
  }
  if (detail.error || !detail.data) {
    return (
      <AppEmptyState
        title="Prediction unavailable"
        description="This prediction cannot be opened from this review link."
      />
    );
  }

  const { prediction, targets } = detail.data;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">
          Selected prediction
        </p>
        <h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">
          {prediction.name}
        </h2>
      </div>
      {targets.length === 0 && feedbackReports.length === 0 ? (
        <AppEmptyState
          title="Nothing to review"
          description="This prediction has no configured feedback forms."
        />
      ) : (
        <>
          <ReviewCombinedFeedbackForm
            token={token}
            predictionId={prediction.id}
            targets={targets}
            outputFeedbackByOrder={outputByOrder}
            explanationFeedbackByOrder={reportFeedbackByOrder}
            reports={reports}
            signatureSchema={signatureSchema}
            predictionValue={prediction.prediction}
            feedbackReports={feedbackReports}
            theme={theme}
            onSaved={async () => {
              await detail.refetch();
              await onReviewChanged();
            }}
          />
          <ReviewAccordionSection
            title="Outputs"
            open={outputsOpen}
            onToggle={() => setOutputsOpen((v) => !v)}
          >
            <ReviewOutputsSection
              targets={targets}
              signatureSchema={signatureSchema}
              predictionValue={prediction.prediction}
            />
          </ReviewAccordionSection>
          <ReviewAccordionSection
            title="Reports"
            open={reportsOpen}
            onToggle={() => setReportsOpen((v) => !v)}
          >
            <ReviewReportsSection reports={feedbackReports} />
          </ReviewAccordionSection>
          <ReviewAccordionSection
            title="Inputs"
            open={inputsOpen}
            onToggle={() => setInputsOpen((v) => !v)}
          >
            <ReviewInputsSection inputs={prediction.inputs} />
          </ReviewAccordionSection>
        </>
      )}
    </div>
  );
}
