/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AlertCircle } from "lucide-react";
import { motion } from "motion/react";

type EditorErrorCardProps = {
	error: any;
};

export function EditorErrorCard({ error }: EditorErrorCardProps) {
	return (
		<motion.div
			className="flex space-x-3 p-3 bg-red-50 dark:bg-red-900/20
                                border border-red-200 dark:border-red-800 rounded-md"
		>
			<AlertCircle size={16} className="text-red-500 mt-0.5" />
			<motion.div>
				<motion.div className="flex items-center space-x-2 mb-1">
					<motion.span className="text-sm font-semibold text-red-800 dark:text-red-200">
						Line {error.line}:{error.column}
					</motion.span>
					{error.path !== "syntax" && (
						<motion.span
							className="text-xs font-mono bg-red-100 dark:bg-red-900/50
                                         text-red-600 dark:text-red-400 px-2 py-0.5 rounded"
						>
							{error.path}
						</motion.span>
					)}
				</motion.div>
				<motion.p className="text-sm text-red-700 dark:text-red-300 break-words">
					{error.message}
				</motion.p>
			</motion.div>
		</motion.div>
	);
}
