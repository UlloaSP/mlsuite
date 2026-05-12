/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import type { ReportConfig } from "mlform/runtime";
import { motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { cx } from "../../app/components";
import { validateMlformSchema } from "../../app/utils/mlform";
import { getActiveCustomExplanationDefinitions, type CatalogExplanationDefinition } from "../../app/utils/mlform/custom-explanation";
import type { OutputFeedbackDto, PredictionDto, TargetDto } from "../api/modelService";
import * as modelApi from "../api/modelService";
import { extractPredictionExplanationEntries } from "../explanation-feedback-utils";
import { GET_EXPLANATION_FEEDBACK_QUERY_KEY, GET_TARGETS_QUERY_KEY } from "../hooks";
import { GET_OUTPUT_FEEDBACK_QUERY_KEY } from "../output-feedback-hooks";
import { getOutputFeedbackFieldIds } from "../output-feedback-questionnaire";
import { getEffectiveFeedbackValues, getQuestionnaireFieldIds } from "../questionnaire-feedback";
import { buildTargetFeedbackValue, getSchemaAwareTargetValue, getTargetReportKey } from "../target-utils";
import { csvEscape, flatten, getExplanationHeaders, toCell, toRecord } from "./export-csv-utils";

export type ExportButtonProps = {
	predictions: PredictionDto[];
	delimiter?: string;
	signatureSchema?: unknown;
};

export function ExportButton({
	predictions,
	delimiter = ",",
	signatureSchema,
}: ExportButtonProps) {
	const [customExplanationDefinitions, setCustomExplanationDefinitions] = useState<readonly CatalogExplanationDefinition[]>([]);

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

	const meta = useMemo(() => {
		const uuid =
			typeof crypto !== "undefined" && "randomUUID" in crypto
				? crypto.randomUUID()
				: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
		const ts = new Date().toISOString();
		const firstName = predictions?.[0]?.name ?? "predictions";
		return { requestId: uuid, timestamp: ts, modelName: firstName };
	}, [predictions]);

	const file = `${(meta.modelName || "predictions")
		.replace(/[^a-z0-9\-_.]+/gi, "_")
		.replace(/_{2,}/g, "_")
		.slice(0, 80)}_${meta.timestamp.slice(0, 10)}.csv`;

	const targetsQueries = useQueries({
		queries: (predictions ?? []).map((prediction) => ({
			queryKey: GET_TARGETS_QUERY_KEY({ predictionId: prediction.id }),
			queryFn: async () => {
				const data = await modelApi.getTargets({ predictionId: prediction.id || "" });
				return Array.isArray(data) ? data : [];
			},
			enabled: Boolean(prediction?.id),
			placeholderData: [] as TargetDto[],
			staleTime: 5 * 60_000,
			gcTime: 10 * 60_000,
		})),
	});
	const explanationFeedbackQueries = useQueries({
		queries: (predictions ?? []).map((prediction) => ({
			queryKey: GET_EXPLANATION_FEEDBACK_QUERY_KEY({ predictionId: prediction.id }),
			queryFn: async () => {
				const data = await modelApi.getExplanationFeedback({ predictionId: prediction.id || "" });
				return Array.isArray(data) ? data : [];
			},
			enabled: Boolean(prediction?.id),
			placeholderData: [] as modelApi.ExplanationFeedbackDto[],
			staleTime: 5 * 60_000,
			gcTime: 10 * 60_000,
		})),
	});
	const outputFeedbackQueries = useQueries({
		queries: (predictions ?? []).map((prediction) => ({
			queryKey: GET_OUTPUT_FEEDBACK_QUERY_KEY({ predictionId: prediction.id }),
			queryFn: async () => {
				const data = await modelApi.getOutputFeedback({ predictionId: prediction.id || "" });
				return Array.isArray(data) ? data : [];
			},
			enabled: Boolean(prediction?.id),
			placeholderData: [] as OutputFeedbackDto[],
			staleTime: 5 * 60_000,
			gcTime: 10 * 60_000,
		})),
	});

	const { headers, rows } = useMemo(() => {
		if (!predictions.length) {
			return { headers: [] as string[], rows: [] as string[][] };
		}

		const inputKeys = Object.keys(flatten(toRecord(predictions[0].inputs))).sort();
		const schemaResult = signatureSchema
			? validateMlformSchema(signatureSchema, { customExplanationDefinitions })
			: null;
		const schema = schemaResult?.success ? schemaResult.data : null;
		const targetHeaders = (schema?.reports ?? []).flatMap((_report: ReportConfig, index: number) => {
			const targetKey = getTargetReportKey(signatureSchema, index);
			return [
				`output.${targetKey}.predicted`,
				`output.${targetKey}.feedback`,
			];
		});
		const explanationHeaders = signatureSchema
			? getExplanationHeaders(signatureSchema, customExplanationDefinitions)
			: [];
		const nextHeaders = ["prediction_id", "reviewer", ...inputKeys, ...targetHeaders, ...explanationHeaders];

		const nextRows = predictions.flatMap((prediction, index) => {
			const targets = ((targetsQueries[index]?.data ?? []) as TargetDto[]).sort(
				(left, right) => Number(left.order) - Number(right.order),
			);
			const inputs = flatten(toRecord(prediction.inputs));
			const targetMap = new Map(targets.map((target) => [target.order, target]));
			const allOutputFeedback = (outputFeedbackQueries[index]?.data ?? []) as OutputFeedbackDto[];
			const allExplanationFeedback = (explanationFeedbackQueries[index]?.data ?? []) as modelApi.ExplanationFeedbackDto[];

			const reviewerIds = new Set<number>();
			const reviewerEmails = new Map<number, string>();
			for (const fb of allOutputFeedback) {
				reviewerIds.add(fb.userId);
				reviewerEmails.set(fb.userId, fb.userEmail);
			}
			for (const fb of allExplanationFeedback) {
				reviewerIds.add(fb.userId);
				reviewerEmails.set(fb.userId, fb.userEmail);
			}

			const buildRow = (reviewerEmail: string, outputFeedbackForUser: OutputFeedbackDto[], explanationFeedbackForUser: modelApi.ExplanationFeedbackDto[]) => {
				const outputFeedbackByOrder = new Map(outputFeedbackForUser.map((item) => [item.order, item]));
				const targetValues = (schema?.reports ?? []).flatMap((_report: ReportConfig, order: number) => {
					const target = targetMap.get(order);
					const reportConfig = schema?.reports?.[order];
					const kind = typeof reportConfig?.kind === "string" ? reportConfig.kind : null;
					const fieldIds = getOutputFeedbackFieldIds(kind);
					const outputFeedback = outputFeedbackByOrder.get(order);
					const feedbackRecord =
						outputFeedback?.value &&
							typeof outputFeedback.value === "object" &&
							!Array.isArray(outputFeedback.value)
							? outputFeedback.value as Record<string, unknown>
							: null;
					const assessmentRaw = feedbackRecord?.[fieldIds.assessment] ?? "";
					const userRealValue = assessmentRaw !== ""
						? buildTargetFeedbackValue(String(assessmentRaw), signatureSchema, order)
						: "";
					return [
						toCell(target ? getSchemaAwareTargetValue(target.value, signatureSchema, order, prediction.prediction) : ""),
						toCell(userRealValue !== "" ? getSchemaAwareTargetValue(userRealValue, signatureSchema, order, prediction.prediction) : ""),
					];
				});

				const explanationEntries = extractPredictionExplanationEntries(
					prediction.prediction,
					signatureSchema,
					customExplanationDefinitions,
				);
				const feedbackByOrder = new Map(explanationFeedbackForUser.map((item) => [item.order, item]));
				const explanationValues = explanationEntries.flatMap((explanation) => {
					const cells = [toCell(explanation.content.join("\n\n"))];
					if (!explanation.feedbackQuestionnaire) {
						return cells;
					}
					const feedbackValues = getEffectiveFeedbackValues(
						feedbackByOrder.get(explanation.order),
						explanation.feedbackQuestionnaire,
					);
					return [
						...cells,
						...getQuestionnaireFieldIds(explanation.feedbackQuestionnaire).map((fieldId) =>
							toCell(feedbackValues[fieldId])),
					];
				});

				return [
					toCell(prediction.id),
					reviewerEmail,
					...inputKeys.map((key) => toCell(inputs[key])),
					...targetValues,
					...explanationValues,
				];
			};

			if (reviewerIds.size === 0) {
				return [buildRow("", [], [])];
			}

			return [...reviewerIds].map((userId) =>
				buildRow(
					reviewerEmails.get(userId) ?? "",
					allOutputFeedback.filter((fb) => fb.userId === userId),
					allExplanationFeedback.filter((fb) => fb.userId === userId),
				),
			);
		});

		return { headers: nextHeaders, rows: nextRows };
	}, [
		customExplanationDefinitions,
		explanationFeedbackQueries,
		outputFeedbackQueries,
		predictions,
		signatureSchema,
		targetsQueries,
	]);

	const hasData = rows.length > 0 && headers.length > 0;

	const handleExport = () => {
		if (!hasData) {
			return;
		}

		const content = `\uFEFF${headers.map((header) => csvEscape(header, delimiter)).join(delimiter)}\n${rows
			.map((row) => row.map((cell) => csvEscape(cell, delimiter)).join(delimiter))
			.join("\n")}`;
		const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = file;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		setTimeout(() => URL.revokeObjectURL(url), 0);
	};

	return (
		<motion.button
			type="button"
			aria-label="Export predictions to CSV"
			onClick={handleExport}
			disabled={!hasData}
			initial={false}
			whileHover={{ scale: hasData ? 1.015 : 1, y: hasData ? -1 : 0 }}
			whileTap={{ scale: hasData ? 0.985 : 1, y: 0 }}
			transition={{ type: "spring", stiffness: 420, damping: 32 }}
			className={cx(
				"group inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-3",
				"text-sm font-medium outline-none transition-shadow",
				"border border-[var(--border-soft)] bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-[var(--shadow-card)]",
				"hover:border-[var(--text-primary)] hover:bg-[var(--surface-muted)] hover:shadow-[var(--shadow-hover)]",
				!hasData && "cursor-not-allowed opacity-60 hover:shadow-none",
			)}
		>
			<FileDown size={18} className="opacity-90 group-hover:opacity-100" />
			<span>Export to CSV</span>
		</motion.button>
	);
}
