import { motion } from "motion/react";
import { EditorBody } from "./EditorBody";
import { EditorFooter } from "./EditorFooter";

type EditorWrapperProps = {}

export function EditorWrapper({ }: EditorWrapperProps) {
    return (
        <motion.div className="flex flex-col flex-1 min-h-0">
            <motion.div className="flex-1 min-h-0">
                <EditorBody />
            </motion.div>
            <EditorFooter />
        </motion.div>
    );
}