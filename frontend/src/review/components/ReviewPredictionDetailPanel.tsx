import { useAtom } from "jotai";
import { useMemo, useState } from "react";
import { themeWithHtmlAtom } from "../../app/atoms";
import { AppEmptyState } from "../../app/components";
import type { CatalogExplanationDefinition } from "../../app/utils/mlform/custom-explanation";
import { extractPredictionExplanationEntries } from "../../models/explanation-feedback-utils";
import { useReviewPredictionDetail } from "../hooks";
import { ReviewAccordionSection } from "./ReviewAccordionSection";
import { ReviewCombinedFeedbackForm } from "./ReviewCombinedFeedbackForm";
import { ReviewExplanationsSection } from "./ReviewExplanationsSection";
import { ReviewInputsSection } from "./ReviewInputsSection";
import { ReviewOutputsSection } from "./ReviewOutputsSection";

type ReviewPredictionDetailPanelProps = {
	token: string;
	predictionId: string;
	signatureSchema: Record<string, unknown>;
	customExplanationDefinitions: readonly CatalogExplanationDefinition[];
	onReviewChanged: () => Promise<unknown> | unknown;
};

export function ReviewPredictionDetailPanel({
	token,
	predictionId,
	signatureSchema,
	customExplanationDefinitions,
	onReviewChanged,
}: ReviewPredictionDetailPanelProps) {
	const [theme] = useAtom(themeWithHtmlAtom);
	const [inputsOpen, setInputsOpen] = useState(false);
	const [outputsOpen, setOutputsOpen] = useState(false);
	const [explanationsOpen, setExplanationsOpen] = useState(false);
	const detail = useReviewPredictionDetail(token, predictionId);
	const reports = useMemo(() => {
		const raw = signatureSchema.reports;
		return Array.isArray(raw) ? raw as Record<string, unknown>[] : [];
	}, [signatureSchema]);
	const explanationEntries = useMemo(() => extractPredictionExplanationEntries(
		detail.data?.prediction.prediction,
		signatureSchema,
		customExplanationDefinitions,
	), [customExplanationDefinitions, detail.data?.prediction.prediction, signatureSchema]);
	const outputByOrder = useMemo(
		() => new Map((detail.data?.outputFeedback ?? []).map((item) => [item.order, item])),
		[detail.data?.outputFeedback],
	);
	const explanationByOrder = useMemo(
		() => new Map((detail.data?.explanationFeedback ?? []).map((item) => [item.order, item])),
		[detail.data?.explanationFeedback],
	);

	if (detail.isLoading) {
		return <p className="text-sm text-[var(--text-secondary)]">Loading prediction</p>;
	}
	if (detail.error || !detail.data) {
		return <AppEmptyState title="Prediction unavailable" description="This prediction cannot be opened from this review link." />;
	}

	const { prediction, targets } = detail.data;

	return (
		<div className="space-y-6">
			<div>
				<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-primary)]">Selected prediction</p>
				<h2 className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{prediction.name}</h2>
			</div>
			{targets.length === 0 && explanationEntries.length === 0 ? (
				<AppEmptyState title="Nothing to review" description="This prediction has no configured feedback forms." />
			) : (
				<>
					<ReviewCombinedFeedbackForm
						token={token}
						predictionId={prediction.id}
						targets={targets}
						outputFeedbackByOrder={outputByOrder}
						explanationFeedbackByOrder={explanationByOrder}
						reports={reports}
						signatureSchema={signatureSchema}
						predictionValue={prediction.prediction}
						explanations={explanationEntries}
						theme={theme}
						onSaved={async () => {
							await detail.refetch();
							await onReviewChanged();
						}}
					/>
					<ReviewAccordionSection title="Outputs" open={outputsOpen} onToggle={() => setOutputsOpen((v) => !v)}>
						<ReviewOutputsSection targets={targets} signatureSchema={signatureSchema} predictionValue={prediction.prediction} />
					</ReviewAccordionSection>
					<ReviewAccordionSection title="Explanations" open={explanationsOpen} onToggle={() => setExplanationsOpen((v) => !v)}>
						<ReviewExplanationsSection explanations={explanationEntries} />
					</ReviewAccordionSection>
					<ReviewAccordionSection title="Inputs" open={inputsOpen} onToggle={() => setInputsOpen((v) => !v)}>
						<ReviewInputsSection inputs={prediction.inputs} />
					</ReviewAccordionSection>
				</>
			)}
		</div>
	);
}
