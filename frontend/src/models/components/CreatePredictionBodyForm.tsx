import { useAtom } from "jotai";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useParams } from "react-router";
import { initMLForm } from "../../app/utils/mlform";
import { schemaAtom } from "../../editor/atoms";
import { showModalAtom } from "../atoms";
import { CreatePredictionModal } from "./CreatePredictionModal";

export function CreatePredictionBodyForm() {
	const { modelId } = useParams<{ modelId: string }>();

	const [schema] = useAtom(schemaAtom);
	const [showModal, setShowModal] = useAtom(showModalAtom);

	const containerRef = useRef<HTMLDivElement>(null);

	const mlform = initMLForm(modelId!);

	const [response, setResponse] = useState<Record<string, object>>({});
	const [inputs, setInputs] = useState<Record<string, object>>({});

	const handleSubmit = useCallback(
		async (inputs: Record<string, object>, response: Record<string, object>) => {
			setInputs(inputs);
			setResponse(response);
			setShowModal(true);
		},
		[],
	);

	useEffect(() => {
		if (containerRef.current) {
			mlform.toHTMLElement(schema, containerRef.current);
		}
	}, [schema]);

	useEffect(() => {
		const unsubscribe = mlform.onSubmit(handleSubmit);
		return unsubscribe;
	}, [mlform, handleSubmit]);

	return (
		<>
			<motion.div
				initial={{ y: 30, opacity: 0 }}
				animate={{ y: 0, opacity: 1 }}
				transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
				className="flex overflow-hidden size-full"
				ref={containerRef}
			/>
			{showModal && (
				<CreatePredictionModal prediction={response} inputs={inputs} />
			)}
		</>
	);
}
