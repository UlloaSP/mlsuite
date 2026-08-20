/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AlertCircle } from "lucide-react";
import { m as motion } from "motion/react";

type EditorErrorCardProps = {
  error: {
    line: number;
    column: number;
    path: string;
    message: string;
    severity?: "error" | "warning";
  };
};

export function EditorErrorCard({ error }: EditorErrorCardProps) {
  const isWarning = error.severity === "warning";
  return (
    <motion.div
      className={`flex space-x-3 rounded-[20px] border p-4 ${
        isWarning
          ? "border-[color:var(--warning-quiet)] bg-[var(--warning-quiet)]"
          : "border-[color:var(--danger-quiet)] bg-[var(--danger-quiet)]"
      }`}
    >
      <AlertCircle
        size={16}
        className={`mt-0.5 ${isWarning ? "text-[var(--warning-text)]" : "text-[var(--danger-text)]"}`}
      />
      <motion.div>
        <motion.div className="flex items-center gap-x-2 mb-1">
          <motion.span
            className={`text-sm font-semibold ${
              isWarning ? "text-[var(--warning-text)]" : "text-[var(--danger-text)]"
            }`}
          >
            Line {error.line}:{error.column}
          </motion.span>
          {error.path !== "syntax" && (
            <motion.span
              className={`rounded-full bg-[var(--surface-primary)] px-2 py-0.5 text-xs font-mono ${
                isWarning ? "text-[var(--warning-text)]" : "text-[var(--danger-text)]"
              }`}
            >
              {error.path}
            </motion.span>
          )}
        </motion.div>
        <motion.p
          className={`break-words text-sm ${
            isWarning ? "text-[var(--warning-text)]" : "text-[var(--danger-text)]"
          }`}
        >
          {error.message}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
