/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CheckCircle, ChevronDown, ChevronUp, Edit3, Save, XCircle } from "lucide-react";
import { useState } from "react";
import { AppButton, AppCopy, AppPanel, AppSectionTitle, AppTextField } from "../../app/components";
import type { ExplanationFeedbackDto, TargetDto } from "../api/modelService";
import type { PredictionStatus } from "../utils";
import { PredictionExplanationFeedbackFields } from "./PredictionExplanationFeedbackFields";

type PredictionFeedbackEditorProps = {
	status: PredictionStatus;
	targets: TargetDto[];
	explanationFeedback: ExplanationFeedbackDto[];
	hasLegacyExplanationWithoutFeedback: boolean;
	targetValues: Record<string, string>;
	explanationValues: Record<string, string>;
	feedbackState: Exclude<PredictionStatus, "PENDING"> | null;
	isEditing: boolean;
	isSaving: boolean;
	onEditStart: () => void;
	onFeedbackStateChange: (state: Exclude<PredictionStatus, "PENDING">) => void;
	onTargetValueChange: (id: string, value: string) => void;
	onExplanationValueChange: (id: string, value: string) => void;
	onSubmit: () => void;
};

export function PredictionFeedbackEditor({
	status,
	targets,
	explanationFeedback,
	hasLegacyExplanationWithoutFeedback,
	targetValues,
	explanationValues,
	feedbackState,
	isEditing,
	isSaving,
	onEditStart,
	onFeedbackStateChange,
	onTargetValueChange,
	onExplanationValueChange,
	onSubmit,
}: PredictionFeedbackEditorProps) {
	const [correctValuesOpen, setCorrectValuesOpen] = useState(false);
	const [correctedExplanationsOpen, setCorrectedExplanationsOpen] = useState(false);
	const isEditable = status === "PENDING" || isEditing;

	return (
		<AppPanel className="space-y-4">
			<div className="flex items-center justify-between gap-3">
				<div>
					<AppSectionTitle>Prediction Feedback</AppSectionTitle>
					<AppCopy>Mark the prediction as correct or update the ground truth.</AppCopy>
				</div>
				{status !== "PENDING" && !isEditing ? (
					<AppButton type="button" variant="ghost" onClick={onEditStart}>
						<Edit3 size={15} />
						Edit
					</AppButton>
				) : null}
			</div>

			{isEditable ? (
				<div className="space-y-4">
					<div className="flex gap-3">
						<AppButton
							type="button"
							variant={feedbackState === "COMPLETED" ? "primary" : "secondary"}
							onClick={() => onFeedbackStateChange("COMPLETED")}
							className="flex-1"
						>
							<CheckCircle size={16} />
							Yes
						</AppButton>
						<AppButton
							type="button"
							variant={feedbackState === "FAILED" ? "danger" : "secondary"}
							onClick={() => onFeedbackStateChange("FAILED")}
							className="flex-1"
						>
							<XCircle size={16} />
							No
						</AppButton>
					</div>

					{hasLegacyExplanationWithoutFeedback ? (
						<div className="rounded-[18px] border border-[var(--warning-quiet)] bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-secondary)]">
							This prediction has stored explanations, but no explanation feedback snapshot. You can
							view them above, but only newly saved predictions can capture explanation corrections.
						</div>
					) : null}

					{feedbackState === "FAILED" ? (
						<div className="space-y-4">
							<div className="grid gap-3 md:grid-cols-2">
								{targets.map((target) => (
									<div key={target.id} className="space-y-2">
										<label className="text-sm font-medium text-[var(--text-primary)]">
											Ground Truth target_{target.order}
										</label>
										<AppTextField
											value={targetValues[target.id] ?? ""}
											onChange={(event) => onTargetValueChange(target.id, event.target.value)}
											placeholder="Enter corrected value..."
											className="w-full rounded-[18px]"
										/>
									</div>
								))}
							</div>

							<PredictionExplanationFeedbackFields
								explanationFeedback={explanationFeedback}
								values={explanationValues}
								onChange={onExplanationValueChange}
							/>
						</div>
					) : null}

					{feedbackState !== null ? (
						<AppButton type="button" onClick={onSubmit} disabled={isSaving}>
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
						<div className="space-y-3">
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

							{explanationFeedback.length > 0 ? (
								<div className="space-y-2">
									<button
										type="button"
										onClick={() => setCorrectedExplanationsOpen((current) => !current)}
										className="flex w-full items-center justify-between text-sm text-[var(--text-secondary)]"
									>
										<span>Corrected Explanations</span>
										{correctedExplanationsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
									</button>
									{correctedExplanationsOpen ? (
										<div className="space-y-3">
											{explanationFeedback.map((item) => (
												<div key={item.id} className="space-y-1 rounded-[18px] bg-[var(--surface-primary)] p-3">
													<p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
														explanation_{item.order}
													</p>
													<p className="whitespace-pre-wrap font-mono text-sm leading-6 text-[var(--success-text)]">
														{String(item.realValue ?? "")}
													</p>
												</div>
											))}
										</div>
									) : null}
								</div>
							) : null}
						</div>
					) : null}
				</div>
			)}
		</AppPanel>
	);
}
