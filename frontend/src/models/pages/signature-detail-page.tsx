import { useQueries } from "@tanstack/react-query";
import { m as motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { AppBreadcrumbs, AppButton, AppEmptyState, AppPage, AppPageHeader, AppSurface, AppTabs } from "../../app/components";
import { NotFoundError } from "../../app/pages/error-page";
import { getActiveCustomExplanationDefinitions, type CatalogExplanationDefinition } from "../../app/utils/mlform/custom-explanation";
import { useUser } from "../../user/hooks";
import { useWorkspaceContext } from "../../workspace/hooks";
import * as modelApi from "../api/modelService";
import { BulkUploadButton } from "../components/BulkUploadButton";
import type { PredictionDateRangeFilter, PredictionFeedbackStatusFilter } from "../components/PredictionHistoryToolbar";
import { ReviewLinkButton } from "../components/ReviewLinkButton";
import { SignatureHistorySection } from "../components/SignatureHistorySection";
import { SignatureTechnicalTab } from "../components/SignatureTechnicalTab";
import { extractPredictionExplanationEntries } from "../explanation-feedback-utils";
import { GET_EXPLANATION_FEEDBACK_QUERY_KEY, useGetModels, useGetPredictions, useGetSignature } from "../hooks";
import { GET_OUTPUT_FEEDBACK_QUERY_KEY } from "../output-feedback-hooks";
import { findModelById, formatTimestamp, getPredictionTimestamp, getSignatureVersionLabel, toTimestampMillis } from "../utils";

type SignatureDetailTab = "technical" | "history";

const SIGNATURE_DETAIL_TABS: SignatureDetailTab[] = ["technical", "history"];

const isWithinDateRange = (timestamp: string, range: PredictionDateRangeFilter): boolean => {
	if (range === "all") {
		return true;
	}

	const time = toTimestampMillis(timestamp);
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
	const { data: workspace } = useWorkspaceContext();
	const { data: models = [] } = useGetModels();
	const model = useMemo(() => findModelById(models, modelId), [models, modelId]);
	const { data: signature, isLoading: isSignatureLoading } = useGetSignature({
		signatureId: signatureId ?? "",
	});
	const { data: predictions = [] } = useGetPredictions({
		signatureId: signatureId ?? "",
	});
	const [customExplanationDefinitions, setCustomExplanationDefinitions] = useState<
		readonly CatalogExplanationDefinition[]
	>([]);
	useEffect(() => {
		let active = true;
		void getActiveCustomExplanationDefinitions()
			.then((definitions) => {
				if (active) setCustomExplanationDefinitions(definitions);
			})
			.catch(() => {
				if (active) setCustomExplanationDefinitions([]);
			});
		return () => {
			active = false;
		};
	}, []);
	const outputFeedbackQueries = useQueries({
		queries: predictions.map((prediction) => ({
			queryKey: GET_OUTPUT_FEEDBACK_QUERY_KEY({ predictionId: prediction.id }),
			queryFn: () => modelApi.getOutputFeedback({ predictionId: prediction.id }),
			enabled: Boolean(prediction.id),
			placeholderData: [],
			staleTime: 5 * 60_000,
			gcTime: 10 * 60_000,
		})),
	});
	const explanationFeedbackQueries = useQueries({
		queries: predictions.map((prediction) => ({
			queryKey: GET_EXPLANATION_FEEDBACK_QUERY_KEY({ predictionId: prediction.id }),
			queryFn: () => modelApi.getExplanationFeedback({ predictionId: prediction.id }),
			enabled: Boolean(prediction.id),
			placeholderData: [],
			staleTime: 5 * 60_000,
			gcTime: 10 * 60_000,
		})),
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
	const currentUserId = user?.id ? Number(user.id) : null;
	const statusByPredictionId = useMemo(() => {
		const map = new Map<string, "COMPLETED" | "PENDING">();
		predictions.forEach((prediction, index) => {
			const outputFeedback = (outputFeedbackQueries[index]?.data ?? []) as modelApi.OutputFeedbackDto[];
			const explanationFeedback = (explanationFeedbackQueries[index]?.data ?? []) as modelApi.ExplanationFeedbackDto[];
			const myOutputFeedback = currentUserId === null
				? []
				: outputFeedback.filter((fb) => fb.userId === currentUserId);
			const myExplanationFeedback = currentUserId === null
				? []
				: explanationFeedback.filter((fb) => fb.userId === currentUserId);
			const predictionReports = (() => {
				const signatureSchema = signature?.inputSignature;
				if (!signatureSchema || typeof signatureSchema !== "object" || signatureSchema === null) {
					return [] as Record<string, unknown>[];
				}
				const reports = (signatureSchema as { reports?: unknown[] }).reports;
				return Array.isArray(reports) ? (reports as Record<string, unknown>[]) : [];
			})();
			const explanationEntries = extractPredictionExplanationEntries(
				prediction.prediction,
				signature?.inputSignature,
				customExplanationDefinitions,
			);
			const requiredOutputs = predictionReports.length;
			const requiredExplanations = explanationEntries.filter((entry) => entry.feedbackQuestionnaire).length;
			const status = myOutputFeedback.length >= requiredOutputs
				&& myExplanationFeedback.length >= requiredExplanations
				? "COMPLETED" as const
				: "PENDING" as const;
			map.set(prediction.id, status);
		});
		return map;
	}, [predictions, outputFeedbackQueries, explanationFeedbackQueries, currentUserId, signature?.inputSignature, customExplanationDefinitions]);
	const visiblePredictions = [...predictions]
		.filter((prediction) => {
			const matchesName = !normalizedQuery
				|| prediction.name.toLowerCase().includes(normalizedQuery);
			const matchesStatus = feedbackStatus === "all"
				|| statusByPredictionId.get(prediction.id) === feedbackStatus;
			const matchesDate = isWithinDateRange(getPredictionTimestamp(prediction), dateRange);
			return matchesName && matchesStatus && matchesDate;
		})
		.sort((left, right) =>
			toTimestampMillis(getPredictionTimestamp(right))
			- toTimestampMillis(getPredictionTimestamp(left)));

	if (!user || error) {
		return <NotFoundError />;
	}
	const canRunPredictions = workspace?.permissions.canRunPredictions ?? false;
	const canManageReviewLinks = workspace?.permissions.canManageReviewLinks ?? false;

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
							{ label: signature ? `Schema ${getSignatureVersionLabel(signature)}` : "Schema" },
						]}
					/>

					{!signature && !isSignatureLoading ? (
						<AppEmptyState
							title="Schema not found"
							description="The selected schema could not be resolved from the current dataset."
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
								eyebrow="Schema Detail"
								title={`Schema ${getSignatureVersionLabel(signature)}`}
								description={`${signature.name} · Created ${formatTimestamp(signature.createdAt)}${signature.origin ? " · Based on previous version" : ""}`}
								aside={
									<>
										{canRunPredictions ? (
											<>
												{modelId && canManageReviewLinks ? (
													<ReviewLinkButton
														modelId={modelId}
														signature={signature}
														predictions={predictions}
														statusByPredictionId={statusByPredictionId}
													/>
												) : null}
												<BulkUploadButton
													signatureId={signatureId ?? ""}
													modelId={modelId ?? ""}
													signatureSchema={signature.inputSignature}
												/>
												<AppButton
													type="button"
													onClick={() =>
														navigate(`/models/${modelId}/signatures/${signature.id}/predictions/create`)
													}
												>
													+ New Prediction
												</AppButton>
											</>
										) : null}
									</>
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
								<SignatureHistorySection
									signature={signature}
									predictions={visiblePredictions}
									statusByPredictionId={statusByPredictionId}
									canRunPredictions={canRunPredictions}
									query={query}
									status={feedbackStatus}
									dateRange={dateRange}
									onQueryChange={setQuery}
									onStatusChange={setFeedbackStatus}
									onDateRangeChange={setDateRange}
									onOpenPrediction={(predictionId) =>
										navigate(`/models/${modelId}/signatures/${signature.id}/predictions/${predictionId}`)
									}
									onCreatePrediction={() =>
										navigate(`/models/${modelId}/signatures/${signature.id}/predictions/create`)
									}
								/>
							)}
						</>
					) : null}
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
