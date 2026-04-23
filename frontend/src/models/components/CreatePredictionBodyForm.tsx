/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { AppButton, AppCopy, AppPanel } from "../../app/components";
import { themeWithHtmlAtom } from "../../app/atoms";
import {
	getActiveCustomFieldDefinitions,
	type CatalogFieldDefinition,
} from "../../app/utils/mlform/custom-field";
import {
	getActiveCustomExplanationDefinitions,
	type CatalogExplanationDefinition,
} from "../../app/utils/mlform/custom-explanation";
import {
	getActiveCustomReportDefinitions,
	type CatalogReportDefinition,
} from "../../app/utils/mlform/custom-report";
import { mountPredictionForm, schemaNeedsActivePluginCatalog } from "../../app/utils/mlform/index";
import { isRecord } from "../../app/utils/mlform/shared";
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

const buildPredictionResponse = (
	raw: unknown,
	form: NonNullable<ReturnType<typeof mountPredictionForm>>["form"],
): Record<string, unknown> => {
	const base = isRecord(raw) ? raw : { raw };
	const reports = isRecord(base.reports) ? { ...base.reports } : {};
	const meta = isRecord(base.meta) ? { ...base.meta } : {};
	const explainErrors = isRecord(meta.explainErrors) ? { ...meta.explainErrors } : {};

	for (const explanation of form.explanations) {
		const explanationState = form.state.explanationStates[explanation.id] ?? explanation.state;
		if (explanationState.status === "done" && explanationState.result !== undefined) {
			reports[explanation.id] = explanationState.result;
			delete explainErrors[explanation.id];
		}
		if (explanationState.status === "error" && explanationState.error) {
			explainErrors[explanation.id] = explanationState.error;
		}
	}

	return {
		...base,
		reports,
		meta: {
			...meta,
			...(Object.keys(explainErrors).length > 0 ? { explainErrors } : {}),
		},
	};
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
	const [explanationsPending, setExplanationsPending] = useState(false);
	const [catalogState, setCatalogState] = useState<CatalogLoadState>(initialCatalogLoadState);
	const [mountError, setMountError] = useState<string | null>(null);
	const schemaNeedsPlugins = schemaNeedsActivePluginCatalog(schema);

	const handleSubmit = useCallback(
		(nextInputs: Record<string, unknown>, nextResponse: Record<string, unknown>) => {
			setInputs(nextInputs);
			setResponse(nextResponse);
			setExplanationsPending(Boolean(mountedRef.current?.form.explanations.length));
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
				getActiveCustomFieldDefinitions(),
				getActiveCustomReportDefinitions(),
				getActiveCustomExplanationDefinitions(),
			]);
			setCatalogState({
				status: "ready",
				fieldDefinitions,
				reportDefinitions,
				definitions,
				error: null,
			});
		} catch (error: unknown) {
			toast.error("Plugin catalog unavailable", {
				description: error instanceof Error ? error.message : String(error),
			});
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
		setMountError(null);
		try {
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
					toast.error("Prediction request failed", {
						description: error instanceof Error ? error.message : String(error),
					});
				},
			});
			mountedRef.current = mounted;
			const unsubscribe = mounted.form.subscribe((state) => {
				if (!state.lastResult) {
					return;
				}

				setResponse(buildPredictionResponse(state.lastResult.raw, mounted.form));
				setExplanationsPending(
					mounted.form.explanations.some((explanation) => {
						const explanationState =
							state.explanationStates[explanation.id] ?? explanation.state;
						return explanationState.status === "idle" || explanationState.status === "loading";
					}),
				);
			});

			return () => {
				unsubscribe();
				mountedRef.current = null;
				mounted.unmount();
			};
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			toast.error("Signature schema incompatible", {
				description: message,
			});
			setMountError(message);
			return;
		}
	}, [catalogState, handleSubmit, modelId, schema, schemaNeedsPlugins, theme]);

	useEffect(() => {
		mountedRef.current?.updateTheme(theme);
	}, [theme]);

	return (
		<>
			{mountError ? (
				<div className="px-4 pb-4">
					<AppPanel className="space-y-4">
						<h2 className="text-lg font-semibold text-[var(--text-primary)]">
							Signature schema incompatible
						</h2>
						<AppCopy>{mountError}</AppCopy>
					</AppPanel>
				</div>
			) : !schemaNeedsPlugins || catalogState.status === "ready" ? (
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
				<CreatePredictionModal
					prediction={response}
					inputs={inputs}
					explanationsPending={explanationsPending}
				/>
			) : null}
		</>
	);
}
