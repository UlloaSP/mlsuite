/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { motion } from "motion/react";
import { useParams } from "react-router";
import { AppPageHeader } from "../../app/components";
import { schemaErrorsAtom } from "../../editor/atoms";
import { ToggleButton } from "./ToggleButton";

const CREATE_PREDICTION_HEADER = "Create New Prediction";
const CREATE_PREDICTION_SUBHEADER =
	"Use the saved schema contract. To change UI fields, create a new schema version.";

export type CreatePredictionHeaderProps = {
	isEditorActive: boolean;
	onToggleMode: () => void;
};

export function CreatePredictionHeader({
	isEditorActive,
	onToggleMode,
}: CreatePredictionHeaderProps) {
	const { modelId, signatureId } = useParams<{ modelId: string; signatureId: string }>();
	const [schemaErrors] = useAtom(schemaErrorsAtom);
	const hasErrors = schemaErrors.some(
		(error: { severity?: "error" | "warning" }) => error.severity !== "warning",
	);
	return (
		<motion.div
			className={`max-h-fit ${!isEditorActive ? "px-4 pt-4" : ""}`}
		>
			<AppPageHeader
				backHref={
					modelId && signatureId
						? `/models/${modelId}/signatures/${signatureId}?tab=history`
						: "/models"
				}
				eyebrow="Prediction Studio"
				title={CREATE_PREDICTION_HEADER}
				description={CREATE_PREDICTION_SUBHEADER}
				aside={
					<ToggleButton
						isJsonActive={isEditorActive}
						isProcessing={hasErrors}
						onToggleMode={onToggleMode}
					/>
				}
			/>
		</motion.div>
	);
}
