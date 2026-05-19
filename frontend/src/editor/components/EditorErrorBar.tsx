/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AlertCircle, CheckCircle, ChevronUp } from "lucide-react";
import { m as motion } from "motion/react";
import { schemaErrorsAtom } from "../atoms";

type EditorErrorBarProps = {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
};

export function EditorErrorBar({ expanded, setExpanded }: EditorErrorBarProps) {
  const [schemaErrors] = useAtom(schemaErrorsAtom);

  const hasErrors = schemaErrors.length > 0;

  return (
    <motion.button
      type="button"
      disabled={!hasErrors}
      onClick={() => hasErrors && setExpanded(!expanded)}
      className={`flex h-10 w-full items-center justify-between px-4 text-sm font-semibold ${
        hasErrors
          ? "cursor-pointer bg-[var(--danger-text)] text-[var(--text-inverse)]"
          : "cursor-default bg-[var(--success-text)] text-[var(--text-inverse)]"
      }`}
    >
      {hasErrors ? (
        <>
          <motion.span className="flex items-center gap-x-2 text-sm font-bold">
            <AlertCircle size={16} />
            <motion.span>
              {schemaErrors.length} Error{schemaErrors.length > 1 && "s"}
            </motion.span>
          </motion.span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronUp size={14} />
          </motion.div>
        </>
      ) : (
        <motion.span className="flex items-center gap-x-2 text-sm font-bold">
          <CheckCircle size={16} />
          <motion.span>Valid</motion.span>
        </motion.span>
      )}
    </motion.button>
  );
}
