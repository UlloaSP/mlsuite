import { useAtom } from "jotai";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Unauthorized } from "../../app/pages/Unauthorized";
import {
	schemaAtom,
	schemaErrorsAtom,
	schemaTextAtom,
} from "../../editor/atoms";
import { EditorWrapper } from "../../editor/components/EditorWrapper";
import { useUser } from "../../user/hooks";
import { CreatePredictionBodyForm } from "../components/CreatePredictionBodyForm";
import { CreatePredictionHeader } from "../components/CreatePredictionHeader";
import { useGetSignature } from "../hooks";

export function CreatePredictionPage() {
	const { signatureId } = useParams<{ signatureId: string }>();
	const { inputs } = useParams<{ inputs: string }>();

	const [, setSchema] = useAtom(schemaAtom);
	const [, setSchemaText] = useAtom(schemaTextAtom);
	const [, setSchemaErrors] = useAtom(schemaErrorsAtom);

	const { data: signature } = useGetSignature({ signatureId: signatureId! });

	const [isEditorActive, setIsEditorActive] = useState(true);

	const { data: user, error } = useUser();

	useEffect(() => {
		if (!signature) return;

		setSchemaErrors([]);

		// Base schema from the fetched signature (not from state)
		const base: any = signature.inputSignature;

		// Optionally prefill from URL param
		let next = base;
		if (inputs) {
			const parsed = JSON.parse(decodeURIComponent(inputs));
			next = {
				...base,
				inputs: base.inputs?.map(
					(item: { title: string; value?: unknown;[k: string]: unknown }) => {
						const v = (parsed as Record<string, unknown>)[item.title];
						return v !== undefined ? { ...item, value: v } : item;
					}
				),
			};
		}

		setSchema(next);
		setSchemaText(JSON.stringify(next, null, 2));
	}, [
		inputs,
		signature,
	]);

	if (!user || error) return <Unauthorized />;

	return (
		<div className="relative flex flex-1 size-full">
			<motion.div
				className="absolute inset-0 flex flex-1 size-full overflow-hidden bg-gradient-to-br from-slate-50 via-purple-50 to-violet-50 dark:from-gray-900 dark:via-slate-800 dark:to-violet-500"
				initial={false}
				animate={{ padding: isEditorActive ? "3rem" : "0rem" }}
				transition={{ duration: 0.5, ease: "easeInOut" }}
			>
				<motion.div
					className="flex flex-col flex-1 gap-4 overflow-hidden
        bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl
        rounded-md shadow-2xl border border-white/20
        dark:border-gray-700/20"
					initial={false}
					animate={{
						opacity: 1,
						y: 0,
						padding: isEditorActive ? "3rem" : "0rem",
					}}
					transition={{ duration: 1, ease: "easeInOut" }}
				>
					<CreatePredictionHeader
						isEditorActive={isEditorActive}
						onToggleMode={() => setIsEditorActive(!isEditorActive)}
					/>
					{isEditorActive ? <EditorWrapper /> : <CreatePredictionBodyForm />}
				</motion.div>
			</motion.div>
		</div>
	);
}
