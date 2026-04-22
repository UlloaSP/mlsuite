/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
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
import { Unauthorized } from "../../app/pages/Unauthorized";
import { useUser } from "../../user/hooks";
import { PredictionDetailPageContent } from "../components/PredictionDetailPageContent";
import { useGetModels, useGetPredictions, useGetSignature } from "../hooks";
import {
	findModelById,
	findPredictionById,
	formatExecutionTime,
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
		return <Unauthorized />;
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
									label: `Signature ${getSignatureVersionLabel(signature)}`,
									to: `/models/${modelId}/signatures/${signature.id}?tab=history`,
								}
								: { label: "Signature", to: modelId ? `/models/${modelId}` : "/models" },
							{ label: prediction ? getPredictionDetailTitle(prediction) : "Prediction" },
						]}
					/>

					{!prediction && !isLoading ? (
						<AppEmptyState
							title="Prediction not found"
							description="The selected prediction could not be resolved from the current signature history."
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
								description={`${getPredictionStatusLabel(prediction.status)} · ${new Date(getPredictionTimestamp(prediction)).toLocaleString()} · ${formatExecutionTime(getPredictionExecutionTime(prediction.prediction))}`}
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
													`/models/${prediction.modelId}/signatures/${prediction.signatureId}/predictions/create/${encodeURIComponent(JSON.stringify(prediction.inputs))}`,
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
