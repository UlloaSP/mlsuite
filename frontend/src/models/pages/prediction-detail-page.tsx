/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { m as motion } from "motion/react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import {
	AppBreadcrumbs,
	AppButton,
	AppEmptyState,
	AppPage,
	AppPageHeader,
	AppSurface,
} from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { useUser } from "../../user/hooks";
import { PredictionDetailPageContent } from "../components/PredictionDetailPageContent";
import { useGetModels, useGetPredictions, useGetSignature } from "../hooks";
import {
	findModelById,
	findPredictionById,
	formatExecutionTime,
	formatTimestamp,
	getPredictionDetailTitle,
	getPredictionExecutionTime,
	getPredictionStatusLabel,
	getPredictionTimestamp,
	getSignatureVersionLabel,
} from "../utils";

export function PredictionDetailPage() {
	const navigate = useNavigate();
	const { modelId, signatureId, predictionId } = useParams<{
		modelId: string;
		signatureId: string;
		predictionId: string;
	}>();
	const { data: user, error } = useUser();
	const { data: models = [] } = useGetModels();
	const model = useMemo(() => findModelById(models, modelId), [models, modelId]);
	const { data: signature } = useGetSignature({ signatureId: signatureId ?? "" });
	const { data: predictions = [], isLoading } = useGetPredictions({ signatureId: signatureId ?? "" });
	const prediction = useMemo(
		() => findPredictionById(predictions, predictionId),
		[predictions, predictionId],
	);

	if (!user || error) {
		return <NotFoundError />;
	}

	return (
		<AppPage>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.45 }}
				className="flex flex-1"
			>
				<AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
					<AppBreadcrumbs
						items={[
							{ label: "Models", to: "/models" },
							model ? { label: model.name, to: `/models/${model.id}?tab=signatures` } : { label: "Model", to: "/models" },
							signature
								? {
									label: `Schema ${getSignatureVersionLabel(signature)}`,
									to: `/models/${modelId}/signatures/${signature.id}?tab=history`,
								}
								: { label: "Schema", to: modelId ? `/models/${modelId}` : "/models" },
							{ label: prediction ? getPredictionDetailTitle(prediction) : "Prediction" },
						]}
					/>

					{!prediction && !isLoading ? (
						<AppEmptyState
							title="Prediction not found"
							description="The selected prediction could not be resolved from the current schema history."
							action={
								<AppButton
									type="button"
									variant="secondary"
									onClick={() =>
										navigate(signatureId ? `/models/${modelId}/signatures/${signatureId}?tab=history` : "/models")
									}
								>
									Back to History
								</AppButton>
							}
						/>
					) : prediction ? (
						<>
							<AppPageHeader
								eyebrow="Prediction Detail"
								title={getPredictionDetailTitle(prediction)}
								description={`Feedback Status: ${getPredictionStatusLabel(prediction.status)} · ${formatTimestamp(getPredictionTimestamp(prediction))} · ${formatExecutionTime(getPredictionExecutionTime(prediction.prediction))}`}
								aside={
									<>
										<AppButton
											type="button"
											variant="secondary"
											onClick={() =>
												navigate(`/models/${modelId}/signatures/${signatureId}?tab=history`)
											}
										>
											Back to History
										</AppButton>
										<AppButton
											type="button"
											onClick={() =>
												navigate(
													`/models/${prediction.modelId}/signatures/${prediction.signatureId}/predictions/create/${encodeURIComponent(JSON.stringify(prediction.inputs))}?view=form`,
												)
											}
										>
											Predict Again
										</AppButton>
									</>
								}
							/>

							<PredictionDetailPageContent prediction={prediction} signature={signature} />
						</>
					) : null}
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
