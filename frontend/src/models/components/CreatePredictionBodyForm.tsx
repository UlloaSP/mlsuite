/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { AppButton, AppCopy, AppPanel } from "../../app/components";
import { themeWithHtmlAtom } from "../../app/atoms";
import {
	getCatalogFieldDefinitions,
	type CatalogFieldDefinition,
} from "../../app/utils/mlform/custom-field";
import {
	getCatalogExplanationDefinitions,
	type CatalogExplanationDefinition,
} from "../../app/utils/mlform/custom-explanation";
import {
	getCatalogReportDefinitions,
	type CatalogReportDefinition,
} from "../../app/utils/mlform/custom-report";
import { mountPredictionForm } from "../../app/utils/mlform/index";
import { schemaAtom } from "../../editor/atoms";
import { showModalAtom } from "../atoms";
import { CreatePredictionModal } from "./CreatePredictionModal";

type CatalogLoadState =
	| {
		status: "loading";
		fieldDefinitions: readonly CatalogFieldDefinition[];
		reportDefinitions: readonly CatalogReportDefinition[];
		definitions: readonly CatalogExplanationDefinition[];
		error: string | null;
	}
	| {
		status: "ready";
		fieldDefinitions: readonly CatalogFieldDefinition[];
		reportDefinitions: readonly CatalogReportDefinition[];
		definitions: readonly CatalogExplanationDefinition[];
		error: string | null;
	}
	| {
		status: "error";
		fieldDefinitions: readonly CatalogFieldDefinition[];
		reportDefinitions: readonly CatalogReportDefinition[];
		definitions: readonly CatalogExplanationDefinition[];
		error: string;
	};

const initialCatalogLoadState: CatalogLoadState = {
	status: "loading",
	fieldDefinitions: [],
	reportDefinitions: [],
	definitions: [],
	error: null,
};

const BUILTIN_FIELD_KINDS = new Set(["text", "number", "boolean", "category", "date", "time-series"]);
const BUILTIN_REPORT_KINDS = new Set(["classifier", "regressor"]);

const schemaNeedsPluginCatalog = (schema: unknown): boolean => {
	if (!schema || typeof schema !== "object") {
		return false;
	}

	const raw = schema as {
		fields?: unknown;
		reports?: unknown;
		explanations?: unknown;
	};

	if (Array.isArray(raw.explanations) && raw.explanations.length > 0) {
		return true;
	}

	if (
		Array.isArray(raw.fields) &&
		raw.fields.some(
			(field) =>
				typeof field === "object" &&
				field !== null &&
				"kind" in field &&
				typeof (field as { kind?: unknown }).kind === "string" &&
				!BUILTIN_FIELD_KINDS.has((field as { kind: string }).kind),
		)
	) {
		return true;
	}

	return (
		Array.isArray(raw.reports) &&
		raw.reports.some(
			(report) =>
				typeof report === "object" &&
				report !== null &&
				"kind" in report &&
				typeof (report as { kind?: unknown }).kind === "string" &&
				!BUILTIN_REPORT_KINDS.has((report as { kind: string }).kind),
		)
	);
};

export function CreatePredictionBodyForm() {
	const { modelId } = useParams<{ modelId: string }>();

	const [schema] = useAtom(schemaAtom);
	const [showModal, setShowModal] = useAtom(showModalAtom);
	const [theme] = useAtom(themeWithHtmlAtom);

	const containerRef = useRef<HTMLDivElement>(null);
	const mountedRef = useRef<ReturnType<typeof mountPredictionForm> | null>(null);

	const [response, setResponse] = useState<Record<string, unknown>>({});
	const [inputs, setInputs] = useState<Record<string, unknown>>({});
	const [catalogState, setCatalogState] = useState<CatalogLoadState>(initialCatalogLoadState);
	const schemaNeedsPlugins = schemaNeedsPluginCatalog(schema);

	const handleSubmit = useCallback(
		(nextInputs: Record<string, unknown>, nextResponse: Record<string, unknown>) => {
			setInputs(nextInputs);
			setResponse(nextResponse);
			setShowModal(true);
		},
		[setShowModal]
	);

	const loadCatalogDefinitions = useCallback(async () => {
		setCatalogState({
			status: "loading",
			fieldDefinitions: [],
			reportDefinitions: [],
			definitions: [],
			error: null,
		});

		try {
			const [fieldDefinitions, reportDefinitions, definitions] = await Promise.all([
				getCatalogFieldDefinitions(),
				getCatalogReportDefinitions(),
				getCatalogExplanationDefinitions(),
			]);
			setCatalogState({
				status: "ready",
				fieldDefinitions,
				reportDefinitions,
				definitions,
				error: null,
			});
		} catch (error: unknown) {
			setCatalogState({
				status: "error",
				fieldDefinitions: [],
				reportDefinitions: [],
				definitions: [],
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}, []);

	useEffect(() => {
		if (!schemaNeedsPlugins) {
			setCatalogState({
				status: "ready",
				fieldDefinitions: [],
				reportDefinitions: [],
				definitions: [],
				error: null,
			});
			return;
		}

		void loadCatalogDefinitions();
	}, [loadCatalogDefinitions, schemaNeedsPlugins]);

	useEffect(() => {
		if (
			!containerRef.current ||
			!schema ||
			!modelId ||
			(schemaNeedsPlugins && catalogState.status !== "ready")
		) {
			return;
		}

		const mounted = mountPredictionForm({
			container: containerRef.current,
			schema,
			modelId,
			theme,
			customFieldDefinitions: catalogState.fieldDefinitions,
			customReportDefinitions: catalogState.reportDefinitions,
			customExplanationDefinitions: catalogState.definitions,
			onSubmit: handleSubmit,
			onSubmitError(error) {
				console.error(error);
			},
		});
		mountedRef.current = mounted;

		return () => {
			mountedRef.current = null;
			mounted.unmount();
		};
	}, [catalogState, handleSubmit, modelId, schema, schemaNeedsPlugins, theme]);

	useEffect(() => {
		mountedRef.current?.updateTheme(theme);
	}, [theme]);

	return (
		<>
			{!schemaNeedsPlugins || catalogState.status === "ready" ? (
				<motion.div
					initial={{ y: 30, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
					className="flex size-full overflow-auto px-4 pb-4"
					ref={containerRef}
				/>
			) : (
				<div className="px-4 pb-4">
					<AppPanel className="space-y-4">
						<h2 className="text-lg font-semibold text-[var(--text-primary)]">
							{catalogState.status === "loading"
								? "Loading explanation catalog"
								: "Explanation catalog unavailable"}
						</h2>
						<AppCopy>
							{catalogState.status === "loading"
								? "Prediction form waits for MLForm plugin definitions before mount so custom field, report, and explanation kinds validate and render correctly."
								: catalogState.error}
						</AppCopy>
						{catalogState.status === "loading" ? (
							<div className="h-20 animate-pulse rounded-[20px] bg-[var(--surface-muted)]" />
						) : (
							<AppButton type="button" onClick={() => void loadCatalogDefinitions()}>
								Retry
							</AppButton>
						)}
					</AppPanel>
				</div>
			)}
			{showModal ? (
				<CreatePredictionModal prediction={response} inputs={inputs} />
			) : null}
		</>
	);
}
