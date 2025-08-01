import { motion } from "framer-motion"
import { useAtom } from "jotai"
import { schemaAtom } from "../../editor/atoms"

interface AnalyzerBodyHTMLProps {
    onToggleMode: () => void
    isProcessing: boolean
    mlform: any
}

import { useEffect, useRef } from "react"
import { ToggleButton } from "./ToggleButton"

export function AnalyzerBodyHTML({ isProcessing, mlform, onToggleMode }: AnalyzerBodyHTMLProps) {
    const [schema] = useAtom(schemaAtom);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (containerRef.current && mlform && typeof mlform.toHTMLElement === "function") {
            mlform.toHTMLElement(schema, containerRef.current);
        }
    }, [schema, mlform]);

    return (
        <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
            <div ref={containerRef} />

            <ToggleButton isProcessing={isProcessing} onToggleMode={onToggleMode} />
        </motion.div>
    )
}
