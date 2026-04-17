/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { AppPage, AppSurface } from "../../app/components";
import { Unauthorized } from "../../app/pages/Unauthorized";
import { applyPredictionInputsToSchema } from "../../app/utils/mlform";
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
			try {
				const parsed = JSON.parse(decodeURIComponent(inputs)) as Record<string, unknown>;
				next = applyPredictionInputsToSchema(base, parsed);
			} catch (error) {
				console.error(error);
			}
		}

		setSchema(next);
		setSchemaText(JSON.stringify(next, null, 2));
	}, [
		inputs,
		signature,
	]);

	if (!user || error) return <Unauthorized />;

	return (
		<AppPage className="relative">
			<motion.div
				className="absolute inset-0 flex flex-1 size-full overflow-hidden"
				initial={false}
				animate={{ padding: isEditorActive ? "0rem" : "0rem" }}
				transition={{ duration: 0.5, ease: "easeInOut" }}
			>
				<AppSurface className="flex flex-1 flex-col gap-4 overflow-hidden">
					<motion.div
						className="flex flex-1 flex-col gap-4 overflow-hidden"
						initial={false}
						animate={{
							opacity: 1,
							y: 0,
							padding: isEditorActive ? "1.5rem" : "0rem",
						}}
						transition={{ duration: 1, ease: "easeInOut" }}
					>
						<CreatePredictionHeader
							isEditorActive={isEditorActive}
							onToggleMode={() => setIsEditorActive(!isEditorActive)}
						/>
						{isEditorActive ? <EditorWrapper /> : <CreatePredictionBodyForm />}
					</motion.div>
				</AppSurface>
			</motion.div>
		</AppPage>
	);
}
