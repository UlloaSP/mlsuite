import { motion } from "motion/react"
import { EditorWrapper } from "../../editor/components/EditorWrapper"
import { ToggleButton } from "./ToggleButton"

interface AnalyzerBodyJSONProps {
    isProcessing: boolean
    onToggleMode: () => void
}

export function AnalyzerBodyJSON({
    isProcessing,
    onToggleMode,
}: AnalyzerBodyJSONProps) {

    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            className="flex flex-col flex-1 min-h-0 bg-white dark:bg-gray-800"
        >
            <EditorWrapper />
            <ToggleButton isProcessing={isProcessing} onToggleMode={onToggleMode} />
        </motion.div>
    )
}
