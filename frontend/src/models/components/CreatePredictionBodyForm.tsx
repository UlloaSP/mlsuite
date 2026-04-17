/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useParams } from "react-router";
import { themeWithHtmlAtom } from "../../app/atoms";
import {
	ensureExplanationReportInSchema,
	mountPredictionForm,
} from "../../app/utils/mlform";
import { schemaAtom } from "../../editor/atoms";
import { showModalAtom } from "../atoms";
import { CreatePredictionModal } from "./CreatePredictionModal";

export function CreatePredictionBodyForm() {
	const { modelId } = useParams<{ modelId: string }>();

	const [schema] = useAtom(schemaAtom);
	const [showModal, setShowModal] = useAtom(showModalAtom);
	const [theme] = useAtom(themeWithHtmlAtom);

	const containerRef = useRef<HTMLDivElement>(null);
	const mountedRef = useRef<ReturnType<typeof mountPredictionForm> | null>(null);

	const [response, setResponse] = useState<Record<string, unknown>>({});
	const [inputs, setInputs] = useState<Record<string, unknown>>({});

	const handleSubmit = useCallback(
		(nextInputs: Record<string, unknown>, nextResponse: Record<string, unknown>) => {
			setInputs(nextInputs);
			setResponse(nextResponse);
			setShowModal(true);
		},
		[setShowModal]
	);

	useEffect(() => {
		if (!containerRef.current || !schema || !modelId) {
			return;
		}

		const mounted = mountPredictionForm({
			container: containerRef.current,
			schema: ensureExplanationReportInSchema(schema),
			modelId,
			theme,
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
	}, [handleSubmit, modelId, schema]);

	useEffect(() => {
		mountedRef.current?.updateTheme(theme);
	}, [theme]);

	return (
		<>
			<motion.div
				initial={{ y: 30, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
				className="flex size-full overflow-auto px-4 pb-4"
				ref={containerRef}
			/>
			{showModal && (
				<CreatePredictionModal prediction={response} inputs={inputs} />
			)}
		</>
	);
}
