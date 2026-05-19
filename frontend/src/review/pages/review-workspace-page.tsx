import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { HttpError } from "../../app/api/appFetch";
import { AppEmptyState } from "../../app/components";
import {
	getActiveCustomExplanationDefinitions,
	type CatalogExplanationDefinition,
} from "../../app/utils/mlform/custom-explanation";
import { ReviewPredictionDetailPanel } from "../components/ReviewPredictionDetailPanel";
import { ReviewPredictionRail } from "../components/ReviewPredictionRail";
import { ReviewShell } from "../components/ReviewShell";
import { ReviewUnavailable } from "../components/ReviewUnavailable";
import { useReviewContext, useSubmitReviewPredictionsMutation } from "../hooks";
import {
	firstReviewPredictionToken,
	hasReviewPredictionToken,
} from "../reviewPredictionSelection";

export function ReviewWorkspacePage() {
	const { token = "", predictionToken } = useParams<{ token: string; predictionToken?: string }>();
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

	const selectedPredictionToken = useMemo(
		() => predictionToken ?? (data ? firstReviewPredictionToken(data.predictions) : undefined),
		[data?.predictions, predictionToken],
	);

	useEffect(() => {
		if (!token || predictionToken || !selectedPredictionToken) return;
		navigate(`/review/${token}/predictions/${selectedPredictionToken}`, { replace: true, viewTransition: false });
	}, [navigate, predictionToken, selectedPredictionToken, token]);

	useEffect(() => {
		if (!token || !predictionToken || !data || hasReviewPredictionToken(data.predictions, predictionToken)) return;
		const nextToken = firstReviewPredictionToken(data.predictions);
		navigate(nextToken ? `/review/${token}/predictions/${nextToken}` : `/review/${token}`, { replace: true, viewTransition: false });
	}, [data?.predictions, navigate, predictionToken, token]);

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
		<ReviewShell title={data.model.name}>
			{data.predictions.length === 0 ? (
				<AppEmptyState title="No predictions available" description="No selected predictions are available for review." />
			) : (
				<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
					<section className="min-w-0">
						{selectedPredictionToken ? (
							<ReviewPredictionDetailPanel
								token={token}
								predictionToken={selectedPredictionToken}
								signatureSchema={data.signature.inputSignature}
								customExplanationDefinitions={definitions}
								onReviewChanged={() => reviewContext.refetch()}
							/>
						) : null}
					</section>
					<ReviewPredictionRail
						items={data.predictions}
						selectedPredictionToken={selectedPredictionToken}
						onSelect={(selectedToken) => navigate(`/review/${token}/predictions/${selectedToken}`, { viewTransition: false })}
						submitting={submitMutation.isPending}
						onSubmitRevision={(selectedTokens) => submitMutation.mutate(selectedTokens)}
					/>
				</div>
			)}
		</ReviewShell>
	);
}
