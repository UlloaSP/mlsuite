/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueries } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { m as motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { cx } from "../../app/components";
import { getActiveCustomExplanationDefinitions, type CatalogExplanationDefinition } from "../../app/utils/mlform/custom-explanation";
import type { OutputFeedbackDto, PredictionDto, TargetDto } from "../api/modelService";
import * as modelApi from "../api/modelService";
import { buildPredictionExportData } from "../buildPredictionExport";
import { GET_EXPLANATION_FEEDBACK_QUERY_KEY, GET_TARGETS_QUERY_KEY } from "../hooks";
import { GET_OUTPUT_FEEDBACK_QUERY_KEY } from "../output-feedback-hooks";
import { csvEscape } from "./export-csv-utils";

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
		return buildPredictionExportData({
			predictions,
			targetsByPrediction: targetsQueries.map((query) => (query.data ?? []) as TargetDto[]),
			outputFeedbackByPrediction: outputFeedbackQueries.map((query) => (query.data ?? []) as OutputFeedbackDto[]),
			explanationFeedbackByPrediction: explanationFeedbackQueries.map(
				(query) => (query.data ?? []) as modelApi.ExplanationFeedbackDto[],
			),
			signatureSchema,
			customExplanationDefinitions,
		});
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
