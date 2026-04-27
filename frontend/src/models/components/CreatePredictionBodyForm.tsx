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
import { mountPredictionForm, schemaNeedsActivePluginCatalog } from "../../app/utils/mlform/index";
import { schemaAtom } from "../../editor/atoms";
import { showModalAtom } from "../atoms";
import {
	buildPersistedPredictionPayload,
	type PersistedExplanationState,
} from "../buildPersistedPredictionPayload";
import { loadPredictionCatalogDefinitions } from "../loadPredictionCatalogDefinitions";
import { CreatePredictionModal } from "./CreatePredictionModal";
import type { PredictionCatalogDefinitions } from "../loadPredictionCatalogDefinitions";

type CatalogLoadState =
	| {
		status: "loading";
		data: PredictionCatalogDefinitions;
		error: string | null;
	}
	| {
		status: "ready";
		data: PredictionCatalogDefinitions;
		error: string | null;
	}
	| {
		status: "error";
		data: PredictionCatalogDefinitions;
		error: string;
	};

const initialCatalogLoadState: CatalogLoadState = {
	status: "loading",
	data: {
		fieldDefinitions: [],
		reportDefinitions: [],
		explanationDefinitions: [],
	},
	error: null,
};

const getPersistedExplanations = (
	form: NonNullable<ReturnType<typeof mountPredictionForm>>["form"],
): PersistedExplanationState[] =>
	form.explanations.map((explanation) => {
		const explanationState = form.state.explanationStates[explanation.id] ?? explanation.state;
		return {
			id: explanation.id,
			status: explanationState.status,
			result: explanationState.result,
			error: explanationState.error,
		};
	});

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
			data: initialCatalogLoadState.data,
			error: null,
		});

		try {
			setCatalogState({
				status: "ready",
				data: await loadPredictionCatalogDefinitions(),
				error: null,
			});
		} catch (error: unknown) {
			toast.error("Plugin catalog unavailable", {
				description: error instanceof Error ? error.message : String(error),
			});
			setCatalogState({
				status: "error",
				data: initialCatalogLoadState.data,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}, []);

	useEffect(() => {
		if (!schemaNeedsPlugins) {
			setCatalogState({
				status: "ready",
				data: initialCatalogLoadState.data,
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
				customFieldDefinitions: catalogState.data.fieldDefinitions,
				customReportDefinitions: catalogState.data.reportDefinitions,
				customExplanationDefinitions: catalogState.data.explanationDefinitions,
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

				setResponse(
					buildPersistedPredictionPayload(
						state.lastResult.raw,
						getPersistedExplanations(mounted.form),
					),
				);
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
					signatureSchema={schema}
					explanationsPending={explanationsPending}
					customExplanationDefinitions={catalogState.data.explanationDefinitions}
					theme={theme}
				/>
			) : null}
		</>
	);
}
