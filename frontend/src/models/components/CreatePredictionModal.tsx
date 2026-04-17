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
import { useCreatePredictionMutation, useCreateTargetMutation } from "../hooks";

export type CreatePredictionModalProps = {
	prediction: Record<string, unknown>;
	inputs: Record<string, unknown>;
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
}: CreatePredictionModalProps) {
	const { signatureId, modelId } = useParams<{ signatureId: string; modelId: string }>();
	const navigate = useNavigate();

	const [, setShowModal] = useAtom(showModalAtom);

	const mutation = useCreatePredictionMutation();
	const mutationTarget = useCreateTargetMutation();

	const [predictionName, setPredictionName] = useState<string>("");
	const [targets, setTargets] = useState<Record<number, object>>({});

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

		const nextTargets: Record<number, number | string> = {};

		if (output.type === "classifier" && Array.isArray(output.probabilities)) {
			output.probabilities.forEach((target, index) => {
				const maxIndex = target.indexOf(Math.max(...target));
				nextTargets[index] = output.mapping?.[maxIndex] ?? maxIndex;
			});
		}

		if (output.type === "regressor" && Array.isArray(output.values)) {
			output.values.forEach((target, index) => {
				nextTargets[index] = target;
			});
		}
		setTargets(nextTargets as unknown as Record<number, object>);
	}, [prediction]);

	const handleSave = async () => {
		const created = await mutation.mutateAsync({
			signatureId: signatureId!,
			name: predictionName,
			inputs: inputs,
			prediction: prediction,
		});

		await Promise.all(
			Object.entries(targets).map(([key, value]) =>
				mutationTarget.mutateAsync({
					predictionId: created.id,
					order: Number(key),
					value: String(value),
				}),
			),
		);

		setShowModal(false);
		navigate(
			`/models/${modelId ?? created.modelId}/signatures/${created.signatureId}/predictions/${created.id}`,
		);
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
												target_{key}:
											</span>
											<span className="font-mono text-sm text-[var(--text-primary)]">
												{value.toString()}
											</span>
										</div>
									))}
								</div>
							</AppPanel>

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
										disabled={!predictionName}
										className="flex-1"
									>
										<Save size={18} />
										<span>Save Prediction</span>
									</AppButton>
								</div>
							</AppPanel>
						</div>
					</div>
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
