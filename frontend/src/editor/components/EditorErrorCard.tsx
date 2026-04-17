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
			className="flex space-x-3 rounded-[20px] border border-[color:var(--danger-quiet)] bg-[var(--danger-quiet)] p-4"
		>
			<AlertCircle size={16} className="mt-0.5 text-[var(--danger-text)]" />
			<motion.div>
				<motion.div className="flex items-center space-x-2 mb-1">
					<motion.span className="text-sm font-semibold text-[var(--danger-text)]">
						Line {error.line}:{error.column}
					</motion.span>
					{error.path !== "syntax" && (
						<motion.span
							className="rounded-full bg-[var(--surface-primary)] px-2 py-0.5 text-xs font-mono text-[var(--danger-text)]"
						>
							{error.path}
						</motion.span>
					)}
				</motion.div>
				<motion.p className="break-words text-sm text-[var(--danger-text)]">
					{error.message}
				</motion.p>
			</motion.div>
		</motion.div>
	);
}
