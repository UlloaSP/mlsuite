/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CheckCircle, ChevronDown, ChevronUp, Edit3, Save, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
	AppBadge,
	AppButton,
	AppCopy,
	AppPanel,
	AppSectionTitle,
	AppTextField,
} from "../../app/components";
import type { PredictionDto, SignatureDto, TargetDto } from "../api/modelService";
import { useGetTargets, useUpdatePredictionMutation, useUpdateTargetMutation } from "../hooks";
import {
	formatExecutionTime,
	getExplanationSnapshot,
	getPredictionExecutionTime,
	getPredictionStatus,
	getPredictionStatusTone,
} from "../utils";
import { PredictionExplanationReport } from "./PredictionExplanationReport";
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
	const [actualValues, setActualValues] = useState<Record<string, string>>({});
	const [isEditing, setIsEditing] = useState(false);
	const [inputsOpen, setInputsOpen] = useState(true);
	const [correctValuesOpen, setCorrectValuesOpen] = useState(false);
	const [notice, setNotice] = useState<string | null>(null);

	const predictionMutation = useUpdatePredictionMutation();
	const targetMutation = useUpdateTargetMutation();
	const { data: targets = [] } = useGetTargets({
		predictionId: prediction.id || "",
	});

	const status = getPredictionStatus(prediction.status);
	const explanationSnapshot = signature
		? getExplanationSnapshot(prediction.prediction, signature.inputSignature)
		: null;

	useEffect(() => {
		if (!targets.length) {
			return;
		}

		setActualValues((prev) => {
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

	const handleFeedbackSubmit = async () => {
		if (!feedbackState) {
			return;
		}

		if (feedbackState === "FAILED") {
			await Promise.all(
				targets.map((target: TargetDto) =>
					targetMutation.mutateAsync({
						targetId: target.id,
						realValue: actualValues[target.id].toString() as unknown as object,
					}),
				),
			);
		}

		await predictionMutation.mutateAsync({
			predictionId: prediction.id,
			status: feedbackState,
		});

		setFeedbackState(null);
		setIsEditing(false);
		setNotice("Prediction updated");
	};

	return (
		<div className="space-y-6">
			{notice ? (
				<div className="rounded-[20px] bg-[var(--success-text)] px-4 py-3 text-sm font-medium text-[var(--text-inverse)]">
					{notice}
				</div>
			) : null}

			<div className="grid gap-4 xl:grid-cols-4">
				<AppPanel>
					<PredictionMetricCell
						label="Targets predicted"
						value={`${targets.length}`}
					/>
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
						value={new Date(prediction.createdAt).toLocaleString()}
					/>
				</AppPanel>
				<AppPanel className="space-y-3">
					<p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">Status</p>
					<AppBadge tone={getPredictionStatusTone(prediction.status)}>
						{status}
					</AppBadge>
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
						<div
							key={target.id}
							className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-3"
						>
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
							<div
								key={key}
								className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-3"
							>
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

			{explanationSnapshot ? (
				<AppPanel className="space-y-4">
					<AppSectionTitle>Explanation</AppSectionTitle>
					<PredictionExplanationReport
						label={explanationSnapshot.label}
						explanations={explanationSnapshot.explanations}
						error={explanationSnapshot.error}
					/>
				</AppPanel>
			) : null}

			<AppPanel className="space-y-4">
				<div className="flex items-center justify-between gap-3">
					<div>
						<AppSectionTitle>Prediction Feedback</AppSectionTitle>
						<AppCopy>Mark the prediction as correct or update the ground truth.</AppCopy>
					</div>
					{status !== "PENDING" && !isEditing ? (
						<AppButton type="button" variant="ghost" onClick={() => setIsEditing(true)}>
							<Edit3 size={15} />
							Edit
						</AppButton>
					) : null}
				</div>

				{status === "PENDING" || isEditing ? (
					<div className="space-y-4">
						<div className="flex gap-3">
							<AppButton
								type="button"
								variant={feedbackState === "COMPLETED" ? "primary" : "secondary"}
								onClick={() => setFeedbackState("COMPLETED")}
								className="flex-1"
							>
								<CheckCircle size={16} />
								Yes
							</AppButton>
							<AppButton
								type="button"
								variant={feedbackState === "FAILED" ? "danger" : "secondary"}
								onClick={() => setFeedbackState("FAILED")}
								className="flex-1"
							>
								<XCircle size={16} />
								No
							</AppButton>
						</div>

						{feedbackState === "FAILED" ? (
							<div className="grid gap-3 md:grid-cols-2">
								{targets.map((target) => (
									<div key={target.id} className="space-y-2">
										<label className="text-sm font-medium text-[var(--text-primary)]">
											Ground Truth target_{target.order}
										</label>
										<AppTextField
											value={actualValues[target.id] ?? ""}
											onChange={(event) =>
												setActualValues((prev) => ({
													...prev,
													[target.id]: event.target.value,
												}))
											}
											placeholder="Enter corrected value..."
											className="w-full rounded-[18px]"
										/>
									</div>
								))}
							</div>
						) : null}

						{feedbackState !== null ? (
							<AppButton type="button" onClick={() => void handleFeedbackSubmit()}>
								<Save size={16} />
								Save Feedback
							</AppButton>
						) : null}
					</div>
				) : (
					<div className="space-y-3 rounded-[20px] bg-[var(--surface-muted)] p-4">
						<div className="flex items-center gap-2">
							{status === "COMPLETED" ? (
								<CheckCircle size={16} className="text-[var(--success-text)]" />
							) : (
								<XCircle size={16} className="text-[var(--danger-text)]" />
							)}
							<p className="text-sm font-medium text-[var(--text-primary)]">{status}</p>
						</div>

						{status === "FAILED" ? (
							<div className="space-y-2">
								<button
									type="button"
									onClick={() => setCorrectValuesOpen((current) => !current)}
									className="flex w-full items-center justify-between text-sm text-[var(--text-secondary)]"
								>
									<span>Corrected Values</span>
									{correctValuesOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
								</button>
								{correctValuesOpen ? (
									<div className="space-y-2">
										{targets.map((target) => (
											<div key={target.id} className="flex items-center justify-between text-sm">
												<span className="text-[var(--text-secondary)]">target_{target.order}</span>
												<span className="font-mono text-[var(--success-text)]">
													{String(target.realValue ?? "")}
												</span>
											</div>
										))}
									</div>
								) : null}
							</div>
						) : null}
					</div>
				)}
			</AppPanel>
		</div>
	);
}
