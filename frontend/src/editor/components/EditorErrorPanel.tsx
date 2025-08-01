import { useAtom } from "jotai";
import { AnimatePresence, motion } from "motion/react";
import { schemaErrorsAtom } from "../atoms";
import { EditorErrorCard } from "./EditorErrorCard";

type EditorErrorPanelProps = {}

export function EditorErrorPanel({ }: EditorErrorPanelProps) {
    const [schemaErrors] = useAtom(schemaErrorsAtom);

    return (
        < AnimatePresence mode="wait" >
            <motion.div
                key="errors"
                className="flex-1 overflow-y-auto bg-white dark:bg-gray-900"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
            >
                <motion.div className="p-4 space-y-3">
                    {schemaErrors.map((error: any, index: number) => (
                        <EditorErrorCard key={index} error={error} />
                    ))}
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
}