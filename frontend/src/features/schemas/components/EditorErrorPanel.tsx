/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSelector } from "@tanstack/react-store";
import { AnimatePresence, m as motion } from "motion/react";
import { useEditorAtoms } from "@/features/schemas/lib/editor-atoms";
import { EditorErrorCard } from "./EditorErrorCard";

export function EditorErrorPanel() {
  const schemaErrors = useSelector(useEditorAtoms().schemaErrors);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="errors"
        className="flex-1 overflow-y-auto rounded-b-card border border-t-0 border-line bg-surface"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="space-y-3 p-4">
          {schemaErrors.map((error) => (
            <EditorErrorCard key={JSON.stringify(error)} error={error} />
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
