/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { AppBadge, AppButton, AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import type { PredictionDto, SignatureDto } from "../api/modelService";
import { useGetExplanationFeedback, useGetTargets, useUpdateExplanationFeedbackMutation, useUpdatePredictionMutation, useUpdateTargetMutation } from "../hooks";
import {
	formatExecutionTime,
	getExplanationSnapshot,
	getPredictionExecutionTime,
	getPredictionStatus,
	getPredictionStatusTone,
	getPredictionTimestamp,
} from "../utils";
import { PredictionExplanationReport } from "./PredictionExplanationReport";
import { PredictionFeedbackEditor } from "./PredictionFeedbackEditor";
import { PredictionMetricCell } from "./PredictionMetricCell";

type PredictionDetailPageContentProps = {
	prediction: PredictionDto;
	signature?: SignatureDto;
};

export function PredictionDetailPageContent({
	prediction,
	signature,
}: PredictionDetailPageContentProps) {
	const navigate = useNavigate();
	const [feedbackState, setFeedbackState] = useState<"COMPLETED" | "FAILED" | null>(null);
	const [targetValues, setTargetValues] = useState<Record<string, string>>({});
	const [explanationValues, setExplanationValues] = useState<Record<string, string>>({});
	const [isEditing, setIsEditing] = useState(false);
	const [inputsOpen, setInputsOpen] = useState(true);

	const predictionMutation = useUpdatePredictionMutation();
	const targetMutation = useUpdateTargetMutation();
	const explanationFeedbackMutation = useUpdateExplanationFeedbackMutation();
	const { data: targets = [] } = useGetTargets({
		predictionId: prediction.id || "",
	});
	const { data: explanationFeedback = [] } = useGetExplanationFeedback({
		predictionId: prediction.id || "",
	});

	const status = getPredictionStatus(prediction.status);
	const explanationSnapshot = signature
		? getExplanationSnapshot(prediction.prediction, signature.inputSignature)
		: null;
	const persistedExplanationValues = explanationFeedback
		.map((item) => String(item.value ?? ""))
		.filter((value) => value.trim().length > 0);
	const displayedExplanations =
		persistedExplanationValues.length > 0
			? persistedExplanationValues
			: explanationSnapshot?.explanations ?? [];
	const hasLegacyExplanationWithoutFeedback =
		explanationFeedback.length === 0 && Boolean(explanationSnapshot?.explanations.length);

	useEffect(() => {
		if (!targets.length) {
			return;
		}

		setTargetValues((prev) => {
			const next = { ...prev };
			for (const target of targets) {
				const key = String(target.id);
				if (next[key] === undefined) {
					next[key] = target.realValue ? String(target.realValue) : "";
				}
			}
			return next;
		});
	}, [targets]);

	useEffect(() => {
		if (!explanationFeedback.length) {
			return;
		}

		setExplanationValues((prev) => {
			const next = { ...prev };
			for (const item of explanationFeedback) {
				const key = String(item.id);
				if (next[key] === undefined) {
					next[key] = item.realValue ? String(item.realValue) : "";
				}
			}
			return next;
		});
	}, [explanationFeedback]);

	const handleFeedbackSubmit = async () => {
		if (!feedbackState) {
			return;
		}

		if (feedbackState === "FAILED") {
			await Promise.all([
				...targets.map((target) =>
					targetMutation.mutateAsync({
						targetId: target.id,
						realValue: targetValues[target.id].toString(),
					}),
				),
				...explanationFeedback.map((item) =>
					explanationFeedbackMutation.mutateAsync({
						explanationFeedbackId: item.id,
						realValue: explanationValues[item.id].toString(),
					}),
				),
			]);
		}

		await predictionMutation.mutateAsync({
			predictionId: prediction.id,
			status: feedbackState,
		});

		setFeedbackState(null);
		setIsEditing(false);
		toast.success("Prediction updated");
	};

	return (
		<div className="space-y-6">
			<div className="grid gap-4 xl:grid-cols-4">
				<AppPanel>
					<PredictionMetricCell label="Targets predicted" value={`${targets.length}`} />
				</AppPanel>
				<AppPanel>
					<PredictionMetricCell
						label="Execution time"
						value={formatExecutionTime(getPredictionExecutionTime(prediction.prediction))}
					/>
				</AppPanel>
				<AppPanel>
					<PredictionMetricCell
						label="Timestamp"
						value={new Date(getPredictionTimestamp(prediction)).toLocaleString()}
					/>
				</AppPanel>
				<AppPanel className="space-y-3">
					<p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Status</p>
					<AppBadge tone={getPredictionStatusTone(prediction.status)}>{status}</AppBadge>
				</AppPanel>
			</div>

			<AppPanel className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<div>
						<AppSectionTitle>Prediction Output</AppSectionTitle>
						<AppCopy>{prediction.name}</AppCopy>
					</div>
					<AppButton
						type="button"
						variant="secondary"
						onClick={() => {
							navigate(
								`/models/${prediction.modelId}/signatures/${prediction.signatureId}/predictions/create/${encodeURIComponent(JSON.stringify(prediction.inputs))}`,
							);
						}}
					>
						Predict Again
					</AppButton>
				</div>

				<div className="grid gap-3 md:grid-cols-2">
					{targets.map((target) => (
						<div key={target.id} className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-3">
							<p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
								target_{target.order}
							</p>
							<p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
								{String(target.value ?? "")}
							</p>
						</div>
					))}
				</div>
			</AppPanel>

			<AppPanel className="space-y-4">
				<button
					type="button"
					onClick={() => setInputsOpen((current) => !current)}
					className="flex w-full items-center justify-between text-left"
				>
					<div>
						<AppSectionTitle>Input Features</AppSectionTitle>
						<AppCopy>Source payload used for this prediction.</AppCopy>
					</div>
					{inputsOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
				</button>

				{inputsOpen ? (
					<div className="grid gap-3 md:grid-cols-2">
						{Object.entries(prediction.inputs).map(([key, value]) => (
							<div key={key} className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-3">
								<p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
									{key}
								</p>
								<p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
									{typeof value === "number" ? value.toLocaleString() : String(value)}
								</p>
							</div>
						))}
					</div>
				) : null}
			</AppPanel>

			{(displayedExplanations.length > 0 || explanationSnapshot?.error) ? (
				<AppPanel className="space-y-4">
					<AppSectionTitle>Explanation</AppSectionTitle>
					<PredictionExplanationReport
						label={explanationSnapshot?.label ?? "Model explanation"}
						explanations={displayedExplanations}
						error={explanationSnapshot?.error}
					/>
				</AppPanel>
			) : null}

			<PredictionFeedbackEditor
				status={status}
				targets={targets}
				explanationFeedback={explanationFeedback}
				hasLegacyExplanationWithoutFeedback={hasLegacyExplanationWithoutFeedback}
				targetValues={targetValues}
				explanationValues={explanationValues}
				feedbackState={feedbackState}
				isEditing={isEditing}
				isSaving={
					predictionMutation.isPending ||
					targetMutation.isPending ||
					explanationFeedbackMutation.isPending
				}
				onEditStart={() => setIsEditing(true)}
				onFeedbackStateChange={setFeedbackState}
				onTargetValueChange={(id, value) =>
					setTargetValues((prev) => ({
						...prev,
						[id]: value,
					}))
				}
				onExplanationValueChange={(id, value) =>
					setExplanationValues((prev) => ({
						...prev,
						[id]: value,
					}))
				}
				onSubmit={() => void handleFeedbackSubmit()}
			/>
		</div>
	);
}
