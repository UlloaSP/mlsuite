import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { HttpError } from "../../app/api/appFetch";
import { AppEmptyState } from "../../app/components";
import {
	getActiveCustomExplanationDefinitions,
	type CatalogExplanationDefinition,
} from "../../app/utils/mlform/custom-explanation";
import { getSignatureVersionLabel } from "../../models/utils";
import { ReviewPredictionDetailPanel } from "../components/ReviewPredictionDetailPanel";
import { ReviewPredictionRail } from "../components/ReviewPredictionRail";
import { ReviewShell } from "../components/ReviewShell";
import { ReviewUnavailable } from "../components/ReviewUnavailable";
import { useReviewContext, useSubmitReviewPredictionsMutation } from "../hooks";
import {
	firstReviewPredictionId,
	hasReviewPredictionId,
	normalizeReviewPredictionId,
} from "../reviewPredictionSelection";

export function ReviewWorkspacePage() {
	const { token = "", predictionId } = useParams<{ token: string; predictionId?: string }>();
	const navigate = useNavigate();
	const reviewContext = useReviewContext(token);
	const { data, error, isLoading } = reviewContext;
	const submitMutation = useSubmitReviewPredictionsMutation(token);
	const [definitions, setDefinitions] = useState<readonly CatalogExplanationDefinition[]>([]);

	useEffect(() => {
		let active = true;
		void getActiveCustomExplanationDefinitions()
			.then((items) => {
				if (active) setDefinitions(items);
			})
			.catch(() => {
				if (active) setDefinitions([]);
			});
		return () => {
			active = false;
		};
	}, []);

	const selectedPredictionId = useMemo(
		() => predictionId ?? (data ? firstReviewPredictionId(data.predictions) : undefined),
		[data?.predictions, predictionId],
	);

	useEffect(() => {
		if (!token || predictionId || !selectedPredictionId) return;
		navigate(`/review/${token}/predictions/${selectedPredictionId}`, { replace: true });
	}, [navigate, predictionId, selectedPredictionId, token]);

	useEffect(() => {
		if (!token || !predictionId || !data || hasReviewPredictionId(data.predictions, predictionId)) return;
		const nextId = firstReviewPredictionId(data.predictions);
		navigate(nextId ? `/review/${token}/predictions/${nextId}` : `/review/${token}`, { replace: true });
	}, [data?.predictions, navigate, predictionId, token]);

	if (isLoading) {
		return <ReviewShell><p className="text-sm text-[var(--text-secondary)]">Loading review</p></ReviewShell>;
	}
	if (error instanceof HttpError && error.status === 403) {
		return <ReviewUnavailable title="Access denied" description="Your account is not allowed to open this review link." />;
	}
	if (error || !data) {
		return <ReviewUnavailable />;
	}

	return (
		<ReviewShell
			title={`${data.model.name} · Schema ${getSignatureVersionLabel(data.signature)}`}
			subtitle={data.organization.name}
		>
			{data.predictions.length === 0 ? (
				<AppEmptyState title="No predictions available" description="No selected predictions are available for review." />
			) : (
				<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
					<section className="min-w-0">
						{selectedPredictionId ? (
							<ReviewPredictionDetailPanel
								token={token}
								predictionId={selectedPredictionId}
								signatureSchema={data.signature.inputSignature}
								customExplanationDefinitions={definitions}
								onReviewChanged={() => reviewContext.refetch()}
							/>
						) : null}
					</section>
					<ReviewPredictionRail
						items={data.predictions}
						selectedPredictionId={selectedPredictionId}
						onSelect={(id) => navigate(`/review/${token}/predictions/${normalizeReviewPredictionId(id)}`)}
						submitting={submitMutation.isPending}
						onSubmitRevision={(ids) => submitMutation.mutate(ids)}
					/>
				</div>
			)}
		</ReviewShell>
	);
}
