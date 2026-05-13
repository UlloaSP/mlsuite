/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { m as motion } from "motion/react";
import { useAtomValue } from "jotai";
import { useState } from "react";
import { schemaErrorsAtom } from "../atoms";
import { EditorErrorBar } from "./EditorErrorBar";
import { EditorErrorPanel } from "./EditorErrorPanel";

export function EditorFooter() {
	const schemaErrors = useAtomValue(schemaErrorsAtom);
	const [expandedRequested, setExpandedRequested] = useState(false);
	const expanded = expandedRequested && schemaErrors.length > 0;

	const closedH = "2rem";
	const openedH = "30vh";

	return (
		<motion.div
			className="w-full shrink-0 z-30 flex flex-col"
			style={{ height: expanded ? openedH : closedH }}
			animate={{ height: expanded ? openedH : closedH }}
			transition={{ duration: 0.25 }}
		>
			<EditorErrorBar expanded={expanded} setExpanded={setExpandedRequested} />
			{expanded && <EditorErrorPanel />}
		</motion.div>
	);
}
