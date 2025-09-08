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

	const [schema, setSchema] = useAtom(schemaAtom);
	const [, setSchemaText] = useAtom(schemaTextAtom);
	const [, setSchemaErrors] = useAtom(schemaErrorsAtom);

	const { data: signature } = useGetSignature({ signatureId: signatureId! });

	const [isEditorActive, setIsEditorActive] = useState(true);
	const [schemaReceived, setSchemaReceived] = useState(false);

	const { data: user, error } = useUser();
	if (!user || error) return <Unauthorized />;

	useEffect(() => {
		if (signature) {
			setSchemaErrors([]);
			setSchema(signature.inputSignature);
			setSchemaText(JSON.stringify(signature.inputSignature, null, 2));
			setSchemaReceived(true);

			if (!!inputs && schemaReceived) {
				const parsedInputs = JSON.parse(decodeURIComponent(inputs));

				const nextSchema = {
					...schema,
					inputs: schema.inputs.map(
						(item: {
							title: string;
							value?: unknown;
							[key: string]: unknown;
						}) => {
							const value = (parsedInputs as Record<string, unknown>)[
								item.title
							];
							return value !== undefined ? { ...item, value } : item;
						},
					),
				};

				setSchema(nextSchema);
				setSchemaText(JSON.stringify(nextSchema, null, 2));
			}
		}
	}, [
		inputs,
		signature,
		schemaReceived,
		setSchemaErrors,
		schema,
		setSchemaText,
		setSchema,
	]);

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
