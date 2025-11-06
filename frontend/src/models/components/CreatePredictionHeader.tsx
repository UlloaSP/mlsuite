/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { schemaErrorsAtom } from "../../editor/atoms";
import { ToggleButton } from "./ToggleButton";

const CREATE_PREDICTION_HEADER = "Create New Prediction";
const CREATE_PREDICTION_SUBHEADER =
	"Submit a new prediction for your model's signature";

export type CreatePredictionHeaderProps = {
	isEditorActive: boolean;
	onToggleMode: () => void;
};

export function CreatePredictionHeader({
	isEditorActive,
	onToggleMode,
}: CreatePredictionHeaderProps) {
	const navigate = useNavigate();
	const [schemaErrors] = useAtom(schemaErrorsAtom);
	const hasErrors = schemaErrors.length > 0;
	return (
		<motion.div
			className={`flex flex-row max-h-fit justify-between ${!isEditorActive ? "px-4 pt-4" : ""}`}
		>
			<motion.div className="flex flex-col max-h-fit">
				<motion.div className="flex-start justify-self-start flex flex-col">
					<motion.button
						onClick={() => navigate("/models")}
						className="self-start inline-flex items-center text-sm font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
					>
						<ArrowLeft size={18} />
						Back
					</motion.button>

					{/* Title */}
					<motion.h1 className="text-5xl leading-20 font-bold bg-gradient-to-r from-gray-900 to-violet-600 dark:from-white dark:to-violet-400 bg-clip-text text-transparent">
						{CREATE_PREDICTION_HEADER}
					</motion.h1>

					{/* Subtitle */}
					<motion.p className="text-slate-400">
						{CREATE_PREDICTION_SUBHEADER}
					</motion.p>
				</motion.div>
			</motion.div>
			<ToggleButton isProcessing={hasErrors} onToggleMode={onToggleMode} />
		</motion.div>
	);
}
