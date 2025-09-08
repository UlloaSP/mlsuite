import { motion } from "motion/react";
import { useState } from "react";
import { EditorErrorBar } from "./EditorErrorBar";
import { EditorErrorPanel } from "./EditorErrorPanel";

interface EditorFooterProps { }

export function EditorFooter({ }: EditorFooterProps) {
    const [expanded, setExpanded] = useState(false);

    const closedH = "2rem";
    const openedH = "30vh";

    return (
        <motion.div
            className="w-full shrink-0 z-30 flex flex-col"
            style={{ height: expanded ? openedH : closedH }}
            animate={{ height: expanded ? openedH : closedH }}
            transition={{ duration: 0.25 }}
        >
            <EditorErrorBar expanded={expanded} setExpanded={setExpanded} />
            {expanded && (
                <EditorErrorPanel />
            )}
        </motion.div>
    );
}
