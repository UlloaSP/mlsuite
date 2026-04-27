/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { schemaErrorsAtom } from "../atoms";
import { EditorErrorCard } from "./EditorErrorCard";

export function EditorErrorPanel() {
	const [schemaErrors] = useAtom(schemaErrorsAtom);

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key="errors"
				className="flex-1 overflow-y-auto rounded-b-[20px] border border-t-0 border-[var(--border-soft)] bg-[var(--surface-primary)]"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				transition={{ duration: 0.2 }}
			>
				<motion.div className="space-y-3 p-4">
					{schemaErrors.map((error: any, index: number) => (
						<EditorErrorCard key={index} error={error} />
					))}
				</motion.div>
			</motion.div>
		</AnimatePresence>
	);
}
