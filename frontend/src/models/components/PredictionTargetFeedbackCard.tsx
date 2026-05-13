/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Edit3, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppButton, AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import type { OutputFeedbackDto, TargetDto } from "../api/modelService";
import { useUpdateTargetMutation } from "../hooks";
import { useCreateOutputFeedbackMutation, useUpdateOutputFeedbackMutation } from "../output-feedback-hooks";
import {
	createOutputFeedbackQuestionnaire,
	getOutputFeedbackFieldIds,
} from "../output-feedback-questionnaire";
import {
	buildOutputFeedbackInitialValues,
	buildTargetUpdateRequest,
	hasOutputFeedback,
} from "../output-feedback-values";
import { getSchemaAwareTargetValue, getTargetLabel, getTargetProbability, formatProbability } from "../target-utils";
import { ExplanationFeedbackSummary } from "./ExplanationFeedbackSummary";
import { ExplanationQuestionnaireMount, type ExplanationQuestionnaireMountHandle } from "./ExplanationQuestionnaireMount";

type PredictionTargetFeedbackCardProps = {
	predictionId: string;
	target: TargetDto;
	outputFeedback?: OutputFeedbackDto;
	otherFeedback?: OutputFeedbackDto[];
	reportConfig?: Record<string, unknown>;
	signatureSchema?: unknown;
	predictionValue: unknown;
	theme: "light" | "dark";
};

export function PredictionTargetFeedbackCard({
	predictionId,
	target,
	outputFeedback,
	otherFeedback,
	reportConfig,
	signatureSchema,
	predictionValue,
	theme,
}: PredictionTargetFeedbackCardProps) {
	const targetMutation = useUpdateTargetMutation();
	const createOutputFeedbackMutation = useCreateOutputFeedbackMutation();
	const updateOutputFeedbackMutation = useUpdateOutputFeedbackMutation();
	const questionnaireRef = useRef<ExplanationQuestionnaireMountHandle | null>(null);
	const questionnaire = useMemo(
		() => createOutputFeedbackQuestionnaire(reportConfig, target, predictionValue),
		[predictionValue, reportConfig, target],
	);
	const fieldIds = useMemo(
		() => getOutputFeedbackFieldIds(typeof reportConfig?.kind === "string" ? reportConfig.kind : null),
		[reportConfig],
	);
	const snapshot = JSON.stringify({
		targetId: target.id,
		outputFeedbackId: outputFeedback?.id,
		outputFeedbackValue: outputFeedback?.value,
		realValue: target.realValue,
	});
	// react-doctor-disable-next-line react-doctor/no-derived-useState -- Local saved copy reflects optimistic create/update before parent query refresh completes.
	const [savedOutputFeedback, setSavedOutputFeedback] = useState(outputFeedback);
	const [draftValues, setDraftValues] = useState<Record<string, unknown>>({});
	const [mode, setMode] = useState<"view" | "edit">("view");

	// react-doctor-disable-next-line react-doctor/no-cascading-set-state -- Prop snapshot reset must restore saved feedback, draft form values, and view mode atomically.
	useEffect(() => {
		setSavedOutputFeedback(outputFeedback);
		setDraftValues(buildOutputFeedbackInitialValues(outputFeedback, questionnaire));
		setMode("view");
	}, [questionnaire, snapshot]);

	const handleSave = async () => {
		try {
			const values = await questionnaireRef.current?.submit();
			const nextValues = values ?? {};

			if (savedOutputFeedback) {
				await updateOutputFeedbackMutation.mutateAsync({
					outputFeedbackId: savedOutputFeedback.id,
					value: nextValues,
				});
			} else {
				const created = await createOutputFeedbackMutation.mutateAsync({
					predictionId,
					order: target.order,
					value: nextValues,
				});
				setSavedOutputFeedback(created);
			}

			await targetMutation.mutateAsync(buildTargetUpdateRequest(
				target.id,
				target.order,
				values ?? {},
				fieldIds.assessment,
				fieldIds.realValue,
				signatureSchema,
			));

			setDraftValues(nextValues);
			setMode("view");
			toast.success("Output feedback saved");
		} catch (error: unknown) {
			toast.error("Output feedback could not be saved", {
				description: error instanceof Error ? error.message : String(error),
			});
		}
	};

	return (
		<AppPanel className="space-y-4">
			<div className="flex items-start justify-between gap-3">
				<div>
					<AppSectionTitle>{getTargetLabel(signatureSchema, target.order)}</AppSectionTitle>
					<AppCopy>
						Predicted value {String(getSchemaAwareTargetValue(target.value, signatureSchema, target.order, predictionValue) ?? "")}
						{getTargetProbability(target.value) !== null ? ` · ${formatProbability(getTargetProbability(target.value)!)}` 
							: ""}
					</AppCopy>
				</div>
				{mode === "view" ? (
					<AppButton type="button" variant="ghost" onClick={() => setMode("edit")}>
						<Edit3 size={15} />
						Edit
					</AppButton>
				) : null}
			</div>

			{mode === "view" ? (
				hasOutputFeedback(savedOutputFeedback)
					? <ExplanationFeedbackSummary schema={questionnaire} values={draftValues} />
					: <AppCopy>No feedback saved yet.</AppCopy>
			) : (
				<div className="space-y-4">
					<ExplanationQuestionnaireMount
						ref={questionnaireRef}
						title="Output Feedback"
						schema={questionnaire}
						initialValues={draftValues}
						editable
						theme={theme}
						mode="embedded"
						onValuesChange={setDraftValues}
					/>
					<div className="flex gap-3">
						<AppButton
							type="button"
							variant="secondary"
							onClick={() => {
								setDraftValues(buildOutputFeedbackInitialValues(savedOutputFeedback, questionnaire));
								setMode("view");
							}}
							className="flex-1"
						>
							Cancel
						</AppButton>
						<AppButton
							type="button"
							onClick={() => void handleSave()}
							disabled={
								targetMutation.isPending ||
								createOutputFeedbackMutation.isPending ||
								updateOutputFeedbackMutation.isPending
							}
							className="flex-1"
						>
							<Save size={16} />
							Save
						</AppButton>
					</div>
				</div>
			)}

			{otherFeedback && otherFeedback.length > 0 && (
				<div className="mt-4 space-y-3 border-t border-[var(--border-soft)] pt-4">
					<p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-muted)]">
						Other reviews ({otherFeedback.length})
					</p>
					{otherFeedback.map((fb) => (
						<div key={fb.id} className="rounded-[14px] bg-[var(--surface-muted)] p-3">
							<p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">{fb.userName}</p>
							<ExplanationFeedbackSummary
								schema={questionnaire}
								values={
									fb.value && typeof fb.value === "object" && !Array.isArray(fb.value)
										? (fb.value as Record<string, unknown>)
										: {}
								}
							/>
						</div>
					))}
				</div>
			)}
		</AppPanel>
	);
}
