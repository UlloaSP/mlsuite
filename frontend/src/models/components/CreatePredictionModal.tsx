/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { Save, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
	AppButton,
	AppCopy,
	AppIconButton,
	AppPanel,
	AppSectionTitle,
	AppTextField,
} from "../../app/components";
import { showModalAtom } from "../atoms";
import { useCreateExplanationFeedbackMutation, useCreatePredictionMutation, useCreateTargetMutation, useGetPredictions } from "../hooks";
import { extractPredictionExplanationEntries } from "../explanation-feedback-utils";
import { formatProbability, getSchemaAwareTargetValue, getTargetClassLabel, getTargetLabel, getTargetProbability } from "../target-utils";
import { PredictionExplanationReport } from "./PredictionExplanationReport";
import { PredictionOverwriteDialog } from "./PredictionOverwriteDialog";

export type CreatePredictionModalProps = {
	prediction: Record<string, unknown>;
	inputs: Record<string, unknown>;
	signatureSchema: unknown;
	explanationsPending: boolean;
};

type PredictionOutput = {
	type?: string;
	execution_time?: number | string;
	probabilities?: number[][];
	mapping?: Array<string | number>;
	values?: Array<string | number>;
};

const asOutput = (value: Record<string, unknown>): PredictionOutput | null => {
	const outputs = value.outputs;
	if (!Array.isArray(outputs) || outputs.length === 0) {
		return null;
	}

	const first = outputs[0];
	return typeof first === "object" && first !== null ? (first as PredictionOutput) : null;
};

export function CreatePredictionModal({
	prediction,
	inputs,
	signatureSchema,
	explanationsPending,
}: CreatePredictionModalProps) {
	const { signatureId, modelId } = useParams<{ signatureId: string; modelId: string }>();
	const navigate = useNavigate();

	const [, setShowModal] = useAtom(showModalAtom);

	const mutation = useCreatePredictionMutation();
	const mutationTarget = useCreateTargetMutation();
	const explanationFeedbackMutation = useCreateExplanationFeedbackMutation();
	const { data: predictions = [] } = useGetPredictions({ signatureId: signatureId ?? "" });

	const [predictionName, setPredictionName] = useState<string>("");
	const [targets, setTargets] = useState<Record<number, unknown>>({});
	const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
	const explanationEntries = extractPredictionExplanationEntries(prediction);

	const formatInputValue = (value: unknown) => {
		if (typeof value === "number") {
			return value.toLocaleString();
		}
		return String(value);
	};

	useEffect(() => {
		const output = asOutput(prediction);
		if (!output) {
			return;
		}

		const nextTargets: Record<number, unknown> = {};

		if (output.type === "classifier" && Array.isArray(output.probabilities)) {
			output.probabilities.forEach((target, index) => {
				const maxIndex = target.indexOf(Math.max(...target));
				nextTargets[index] = {
					value: getTargetClassLabel(signatureSchema, index, maxIndex)
						?? output.mapping?.[maxIndex]
						?? maxIndex,
					classIndex: maxIndex,
					probability: target[maxIndex],
				};
			});
		}

		if (output.type === "regressor" && Array.isArray(output.values)) {
			output.values.forEach((target, index) => {
				nextTargets[index] = target;
			});
		}
		setTargets(nextTargets);
	}, [prediction, signatureSchema]);

	const savePrediction = async (overwrite: boolean) => {
		const normalizedName = predictionName.trim();
		const created = await mutation.mutateAsync({
			signatureId: signatureId!,
			name: normalizedName,
			overwrite,
			inputs: inputs,
			prediction: prediction,
		});

		await Promise.all(
			Object.entries(targets).map(([key, value]) =>
				mutationTarget.mutateAsync({
					predictionId: created.id,
					order: Number(key),
					value,
				}),
			),
		);
		await Promise.all(
			explanationEntries.map((entry) =>
				explanationFeedbackMutation.mutateAsync({
					predictionId: created.id,
					order: entry.order,
					value: entry.value,
				}),
			),
		);

		setShowModal(false);
		navigate(
			`/models/${modelId ?? created.modelId}/signatures/${created.signatureId}/predictions/${created.id}`,
		);
	};

	const handleSave = async () => {
		const normalizedName = predictionName.trim();
		const hasDuplicate = predictions.some((item) => item.name === normalizedName);

		if (hasDuplicate) {
			setShowOverwriteDialog(true);
			return;
		}

		await savePrediction(false);
	};

	const output = asOutput(prediction);

	return (
		<AnimatePresence>
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				className="fixed inset-0 z-40 flex bg-black/40 backdrop-blur-sm"
				onClick={() => setShowModal(false)}
			>
				<motion.div
					initial={{ x: "100%", opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={{ x: "100%", opacity: 0 }}
					transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
					className="relative z-50 m-8 flex flex-1 flex-col overflow-hidden rounded-[32px] border border-[var(--border-soft)] bg-[var(--surface-primary)] shadow-[var(--shadow-hover)]"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="flex items-center justify-between border-b border-[var(--border-soft)] p-8">
						<div className="space-y-2">
							<AppCopy className="text-xs uppercase tracking-[0.22em]">
								Prediction Review
							</AppCopy>
							<AppSectionTitle className="text-4xl">
								Create New Prediction
							</AppSectionTitle>
						</div>
						<AppIconButton
							type="button"
							aria-label="Close modal"
							onClick={() => setShowModal(false)}
						>
							<X size={24} />
						</AppIconButton>
					</div>

					<div className="flex flex-1 flex-col overflow-hidden xl:flex-row">
						<div className="flex flex-1 flex-col gap-8 overflow-hidden p-8">
							<AppPanel className="space-y-3">
								<div className="flex items-center justify-between">
									<span className="text-sm font-semibold text-[var(--text-secondary)]">
										Type:
									</span>
									<span className="font-mono font-medium text-[var(--text-primary)]">
										{output?.type || "N/A"}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-semibold text-[var(--text-secondary)]">
										Execution Time:
									</span>
									<span className="font-mono font-medium text-[var(--text-primary)]">
										{output?.execution_time || "N/A"}
									</span>
								</div>
								<div className="flex items-center justify-between">
									<span className="text-sm font-semibold text-[var(--text-secondary)]">
										Status:
									</span>
									<span className="font-mono font-medium text-[var(--text-primary)]">
										pending
									</span>
								</div>
							</AppPanel>

							<AppPanel className="flex flex-1 flex-col space-y-4 overflow-hidden">
								<AppSectionTitle>Input Features</AppSectionTitle>
								<div className="space-y-3 overflow-y-auto">
									{Object.entries(inputs).map(([key, value]) => (
										<div
											key={key}
											className="flex items-center justify-between rounded-[20px] bg-[var(--surface-muted)] p-3"
										>
											<span className="text-sm font-medium text-[var(--text-secondary)]">
												{key}:
											</span>
											<span className="font-mono text-sm text-[var(--text-primary)]">
												{formatInputValue(value)}
											</span>
										</div>
									))}
								</div>
							</AppPanel>
						</div>

						<div className="flex flex-1 flex-col gap-8 overflow-hidden p-8 pt-0 xl:pt-8">
							<AppPanel className="flex flex-1 flex-col space-y-4 overflow-hidden">
								<AppSectionTitle>Targets</AppSectionTitle>
								<div className="space-y-3 overflow-y-auto">
									{Object.entries(targets).map(([key, value]) => (
										<div
											key={key}
											className="flex items-center justify-between rounded-[20px] bg-[var(--surface-muted)] p-3"
										>
											<span className="text-sm font-medium text-[var(--text-secondary)]">
												{getTargetLabel(signatureSchema, Number(key))}:
											</span>
											<span className="font-mono text-sm text-[var(--text-primary)]">
												{String(getSchemaAwareTargetValue(value, signatureSchema, Number(key)))}
											</span>
											{getTargetProbability(value) !== null ? (
												<span className="font-mono text-xs text-[var(--text-muted)]">
													{formatProbability(getTargetProbability(value)!)}
												</span>
											) : null}
										</div>
									))}
								</div>
							</AppPanel>

							{explanationEntries.length > 0 ? (
								<AppPanel className="space-y-4">
									<AppSectionTitle>Explanation</AppSectionTitle>
									{explanationsPending ? (
										<AppCopy>Waiting for explanation plugin result...</AppCopy>
									) : null}
									<PredictionExplanationReport
										label="Model explanation"
										explanations={explanationEntries.map((entry) => entry.value)}
									/>
								</AppPanel>
							) : null}

							<AppPanel className="space-y-4 p-6">
								<div className="space-y-3">
									<AppSectionTitle>Prediction Name</AppSectionTitle>
									<AppTextField
										id="prediction-name"
										type="text"
										value={predictionName}
										onChange={(e) => setPredictionName(e.target.value)}
										placeholder="Ex: Customer Churn v2.0"
										className="w-full"
									/>
								</div>

								<div className="flex gap-4 pt-2">
									<AppButton
										onClick={() => setShowModal(false)}
										variant="secondary"
										className="flex-1"
									>
										Cancel
									</AppButton>

									<AppButton
										onClick={handleSave}
										disabled={!predictionName.trim() || explanationsPending}
										className="flex-1"
									>
										<Save size={18} />
										<span>Save Prediction</span>
									</AppButton>
								</div>
							</AppPanel>
						</div>
					</div>
					<PredictionOverwriteDialog
						open={showOverwriteDialog}
						predictionName={predictionName.trim()}
						onCancel={() => setShowOverwriteDialog(false)}
						onConfirm={async () => {
							setShowOverwriteDialog(false);
							await savePrediction(true);
						}}
					/>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
