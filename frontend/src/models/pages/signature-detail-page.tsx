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
import { NotFoundError } from "../../app/pages/error-page";
import { useUser } from "../../user/hooks";
import { PredictionHistoryTable } from "../components/PredictionHistoryTable";
import {
	PredictionHistoryToolbar,
} from "../components/PredictionHistoryToolbar";
import type {
	PredictionDateRangeFilter,
	PredictionFeedbackStatusFilter,
} from "../components/PredictionHistoryToolbar";
import { SignatureTechnicalTab } from "../components/SignatureTechnicalTab";
import { useGetModels, useGetPredictions, useGetSignature } from "../hooks";
import {
	findModelById,
	getPredictionStatus,
	getPredictionTimestamp,
	getSignatureVersionLabel,
} from "../utils";

type SignatureDetailTab = "technical" | "history";

const SIGNATURE_DETAIL_TABS: SignatureDetailTab[] = ["technical", "history"];

const isWithinDateRange = (timestamp: string, range: PredictionDateRangeFilter): boolean => {
	if (range === "all") {
		return true;
	}

	const time = new Date(timestamp).getTime();
	if (Number.isNaN(time)) {
		return false;
	}

	const now = new Date();
	const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

	switch (range) {
		case "today":
			return time >= startOfToday;
		case "last7":
			return time >= now.getTime() - 7 * 24 * 60 * 60 * 1000;
		case "last30":
			return time >= now.getTime() - 30 * 24 * 60 * 60 * 1000;
		default:
			return true;
	}
};

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
	const [feedbackStatus, setFeedbackStatus] = useState<PredictionFeedbackStatusFilter>("all");
	const [dateRange, setDateRange] = useState<PredictionDateRangeFilter>("all");

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
			const matchesName = !normalizedQuery
				|| prediction.name.toLowerCase().includes(normalizedQuery);
			const matchesStatus = feedbackStatus === "all"
				|| getPredictionStatus(prediction.status) === feedbackStatus;
			const matchesDate = isWithinDateRange(getPredictionTimestamp(prediction), dateRange);
			return matchesName && matchesStatus && matchesDate;
		})
		.sort((left, right) =>
			new Date(getPredictionTimestamp(right)).getTime()
			- new Date(getPredictionTimestamp(left)).getTime());

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
										status={feedbackStatus}
										dateRange={dateRange}
										onQueryChange={setQuery}
										onStatusChange={setFeedbackStatus}
										onDateRangeChange={setDateRange}
										predictions={visiblePredictions}
										signatureSchema={signature.inputSignature}
									/>

									{visiblePredictions.length === 0 ? (
										<AppEmptyState
											title="No predictions found"
											description={
												query || feedbackStatus !== "all" || dateRange !== "all"
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
