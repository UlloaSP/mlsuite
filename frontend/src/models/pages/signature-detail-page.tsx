/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import {
	AppBreadcrumbs,
	AppButton,
	AppEmptyState,
	AppPage,
	AppPageHeader,
	AppSurface,
	AppTabs,
} from "../../app/components";
import { Unauthorized } from "../../app/pages/Unauthorized";
import { useUser } from "../../user/hooks";
import { PredictionHistoryTable } from "../components/PredictionHistoryTable";
import {
	PredictionHistoryToolbar,
} from "../components/PredictionHistoryToolbar";
import type { PredictionHistorySort } from "../components/PredictionHistoryToolbar";
import { SignatureTechnicalTab } from "../components/SignatureTechnicalTab";
import { useGetModels, useGetPredictions, useGetSignature } from "../hooks";
import {
	findModelById,
	getPredictionExecutionTime,
	getPredictionStatus,
	getSignatureVersionLabel,
} from "../utils";

type SignatureDetailTab = "technical" | "history";

const SIGNATURE_DETAIL_TABS: SignatureDetailTab[] = ["technical", "history"];

export function SignatureDetailPage() {
	const navigate = useNavigate();
	const { modelId, signatureId } = useParams<{ modelId: string; signatureId: string }>();
	const [searchParams, setSearchParams] = useSearchParams();
	const { data: user, error } = useUser();
	const { data: models = [] } = useGetModels();
	const model = useMemo(() => findModelById(models, modelId), [models, modelId]);
	const { data: signature, isLoading: isSignatureLoading } = useGetSignature({
		signatureId: signatureId ?? "",
	});
	const { data: predictions = [] } = useGetPredictions({
		signatureId: signatureId ?? "",
	});

	const [query, setQuery] = useState("");
	const [sort, setSort] = useState<PredictionHistorySort>("updated");

	const tabParam = searchParams.get("tab");
	const activeTab: SignatureDetailTab = SIGNATURE_DETAIL_TABS.includes(tabParam as SignatureDetailTab)
		? (tabParam as SignatureDetailTab)
		: "history";

	const setTab = (tab: SignatureDetailTab) => {
		const next = new URLSearchParams(searchParams);
		next.set("tab", tab);
		setSearchParams(next, { replace: true });
	};

	const normalizedQuery = query.trim().toLowerCase();
	const visiblePredictions = [...predictions]
		.filter((prediction) => {
			if (!normalizedQuery) {
				return true;
			}

			return [prediction.id, prediction.name, String(prediction.status ?? "")]
				.some((value) => value.toLowerCase().includes(normalizedQuery));
		})
		.sort((left, right) => {
			switch (sort) {
				case "status":
					return getPredictionStatus(left.status).localeCompare(getPredictionStatus(right.status));
				case "latency":
					return (getPredictionExecutionTime(right.prediction) ?? -1) - (getPredictionExecutionTime(left.prediction) ?? -1);
				case "updated":
				default:
					return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
			}
		});

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
							{ label: signature ? `Signature ${getSignatureVersionLabel(signature)}` : "Signature" },
						]}
					/>

					{!signature && !isSignatureLoading ? (
						<AppEmptyState
							title="Signature not found"
							description="The selected signature could not be resolved from the current dataset."
							action={
								<AppButton
									type="button"
									variant="secondary"
									onClick={() =>
										navigate(modelId ? `/models/${modelId}?tab=signatures` : "/models")
									}
								>
									Back
								</AppButton>
							}
						/>
					) : signature ? (
						<>
							<AppPageHeader
								eyebrow="Signature Detail"
								title={`Signature ${getSignatureVersionLabel(signature)}`}
								description={`${signature.name} · Created ${new Date(signature.createdAt).toLocaleString()}${signature.origin ? " · Based on previous version" : ""}`}
								aside={
									<AppButton
										type="button"
										onClick={() =>
											navigate(`/models/${modelId}/signatures/${signature.id}/predictions/create`)
										}
									>
										+ New Prediction
									</AppButton>
								}
							/>

							<AppTabs<SignatureDetailTab>
								items={[
									{ value: "technical", label: "Detalles Técnicos" },
									{ value: "history", label: "Prediction History" },
								]}
								value={activeTab}
								onChange={setTab}
							/>

							{activeTab === "technical" ? (
								<SignatureTechnicalTab signature={signature} />
							) : (
								<div className="space-y-4">
									<PredictionHistoryToolbar
										query={query}
										sort={sort}
										onQueryChange={setQuery}
										onSortChange={setSort}
										predictions={visiblePredictions}
									/>

									{visiblePredictions.length === 0 ? (
										<AppEmptyState
											title="No predictions found"
											description={
												query
													? "No prediction matches the current search terms."
													: "Create the first prediction for this signature to populate history."
											}
											action={
												<AppButton
													type="button"
													onClick={() =>
														navigate(`/models/${modelId}/signatures/${signature.id}/predictions/create`)
													}
												>
													+ New Prediction
												</AppButton>
											}
										/>
									) : (
										<PredictionHistoryTable
											predictions={visiblePredictions}
											onOpenPrediction={(predictionId) =>
												navigate(`/models/${modelId}/signatures/${signature.id}/predictions/${predictionId}`)
											}
										/>
									)}
								</div>
							)}
						</>
					) : null}
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
