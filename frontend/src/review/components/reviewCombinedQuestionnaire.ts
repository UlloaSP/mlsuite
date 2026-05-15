import type { FieldConfig, SubmitRequest, Transport } from "mlform/runtime";
import type {
	ExplanationFeedbackDto,
	OutputFeedbackDto,
	TargetDto,
} from "../../models/api/modelService";
import { buildQuestionnaireFormSchema, type QuestionnaireSchema } from "../../models/questionnaire-schema";
import { getEffectiveFeedbackValues, type PredictionExplanationDescriptor } from "../../models/questionnaire-feedback";
import { createOutputFeedbackQuestionnaire } from "../../models/output-feedback-questionnaire";
import { buildOutputFeedbackInitialValues } from "../../models/output-feedback-values";
import { formatProbability, getSchemaAwareTargetValue, getTargetLabel, getTargetProbability } from "../../models/target-utils";

type FeedbackKind = "output" | "explanation";

export type ReviewFeedbackStep = {
	id: string;
	kind: FeedbackKind;
	order: number;
	title: string;
	description: string;
	schema: QuestionnaireSchema;
	initialValues: Record<string, unknown>;
	feedback?: OutputFeedbackDto | ExplanationFeedbackDto;
};

type BuildReviewFeedbackStepsArgs = {
	targets: TargetDto[];
	outputFeedbackByOrder: Map<number, OutputFeedbackDto>;
	explanationFeedbackByOrder: Map<number, ExplanationFeedbackDto>;
	reports: Record<string, unknown>[];
	signatureSchema: unknown;
	predictionValue: unknown;
	explanations: PredictionExplanationDescriptor[];
};

const fieldId = (field: FieldConfig, fallback: string): string =>
	typeof field.id === "string" && field.id.trim().length > 0 ? field.id : fallback;

const prefix = (stepId: string, id: string): string => `${stepId}-${id}`;

const text = (value: unknown): string => {
	if (value === null || value === undefined || value === "") return "No value";
	return typeof value === "string" ? value : JSON.stringify(value);
};

const outputDescription = (
	target: TargetDto,
	signatureSchema: unknown,
	predictionValue: unknown,
): string => {
	const value = getSchemaAwareTargetValue(target.value, signatureSchema, target.order, predictionValue);
	const probability = getTargetProbability(target.value);
	return probability === null
		? `Prediction result: ${text(value)}`
		: `Prediction result: ${text(value)} · ${formatProbability(probability)}`;
};

export const buildReviewFeedbackSteps = ({
	targets,
	outputFeedbackByOrder,
	explanationFeedbackByOrder,
	reports,
	signatureSchema,
	predictionValue,
	explanations,
}: BuildReviewFeedbackStepsArgs): ReviewFeedbackStep[] => [
	...targets.map((target, index) => {
		const schema = createOutputFeedbackQuestionnaire(reports[target.order], target, predictionValue);
		return {
			id: `output-${target.order}`,
			kind: "output" as const,
			order: target.order,
			title: `Output ${index + 1}: ${getTargetLabel(signatureSchema, target.order)}`,
			description: outputDescription(target, signatureSchema, predictionValue),
			schema,
			initialValues: buildOutputFeedbackInitialValues(outputFeedbackByOrder.get(target.order), schema),
			feedback: outputFeedbackByOrder.get(target.order),
		};
	}),
	...explanations.flatMap((explanation, index) => {
		if (!explanation.feedbackQuestionnaire) return [];
		return [{
			id: `explanation-${explanation.order}`,
			kind: "explanation" as const,
			order: explanation.order,
			title: `Explanation ${index + 1}: ${explanation.label}`,
			description: `Prediction explanation:\n${explanation.content.join("\n\n")}`,
			schema: explanation.feedbackQuestionnaire,
			initialValues: getEffectiveFeedbackValues(
				explanationFeedbackByOrder.get(explanation.order),
				explanation.feedbackQuestionnaire,
			),
			feedback: explanationFeedbackByOrder.get(explanation.order),
		}];
	}),
];

export const buildCombinedReviewQuestionnaire = (
	steps: readonly ReviewFeedbackStep[],
): { schema: QuestionnaireSchema; initialValues: Record<string, unknown> } => {
	const initialValues: Record<string, unknown> = {};
	const schema: QuestionnaireSchema = {
		steps: steps.map((step) => {
			const fields = buildQuestionnaireFormSchema(step.schema).fields.map((field: FieldConfig, index: number) => {
				const sourceId = fieldId(field, `field-${index + 1}`);
				const nextId = prefix(step.id, sourceId);
				if (sourceId in step.initialValues) {
					initialValues[nextId] = step.initialValues[sourceId];
				}
				return { ...field, id: nextId };
			});
			return {
				id: step.id,
				title: step.title,
				description: step.description,
				fields,
			};
		}),
	};
	return { schema, initialValues };
};

export const valuesForStep = (
	allValues: Record<string, unknown>,
	step: ReviewFeedbackStep,
): Record<string, unknown> => {
	const result: Record<string, unknown> = {};
	buildQuestionnaireFormSchema(step.schema).fields.forEach((field: FieldConfig, index: number) => {
		const sourceId = fieldId(field, `field-${index + 1}`);
		const value = allValues[prefix(step.id, sourceId)];
		if (value !== undefined) result[sourceId] = value;
	});
	return result;
};

export const createReviewQuestionnaireTransport = (
	onSubmit: (values: Record<string, unknown>) => Promise<void>,
): Transport => ({
	async submit(request: SubmitRequest) {
		const values = typeof request.serializedValues === "object" && request.serializedValues !== null
			? request.serializedValues as Record<string, unknown>
			: {};
		await onSubmit(values);
		return { raw: values, meta: {}, reports: {} };
	},
});
