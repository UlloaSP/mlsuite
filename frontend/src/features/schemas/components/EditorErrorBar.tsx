/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AlertCircle, CheckCircle, ChevronUp } from "lucide-react";
import { m as motion } from "motion/react";
import { schemaErrorsAtom } from "@/features/schemas/lib/editor-atoms";

type EditorErrorBarProps = {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
};

export function EditorErrorBar({ expanded, setExpanded }: EditorErrorBarProps) {
  const [schemaErrors] = useAtom(schemaErrorsAtom);

  const hasErrors = schemaErrors.length > 0;

  return (
    <button
      type="button"
      disabled={!hasErrors}
      onClick={() => hasErrors && setExpanded(!expanded)}
      className={`flex h-10 w-full items-center justify-between px-4 text-sm font-semibold ${
        hasErrors
          ? "cursor-pointer bg-danger-fg text-fg-inverse"
          : "cursor-default bg-success-fg text-fg-inverse"
      }`}
    >
      {hasErrors ? (
        <>
          <span className="flex items-center gap-x-2 text-sm font-bold">
            <AlertCircle size={16} />
            <span>
              {schemaErrors.length} Error{schemaErrors.length > 1 && "s"}
            </span>
          </span>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronUp size={14} />
          </motion.div>
        </>
      ) : (
        <span className="flex items-center gap-x-2 text-sm font-bold">
          <CheckCircle size={16} />
          <span>Valid</span>
        </span>
      )}
    </button>
  );
}
