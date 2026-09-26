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
      className={`flex space-x-3 rounded-2xl border p-4 ${
        isWarning
          ? "border-warning-subtle bg-warning-subtle"
          : "border-danger-subtle bg-danger-subtle"
      }`}
    >
      <AlertCircle
        size={16}
        className={`mt-0.5 ${isWarning ? "text-warning-fg" : "text-danger-fg"}`}
      />
      <motion.div>
        <motion.div className="flex items-center gap-x-2 mb-1">
          <motion.span
            className={`text-sm font-semibold ${isWarning ? "text-warning-fg" : "text-danger-fg"}`}
          >
            Line {error.line}:{error.column}
          </motion.span>
          {error.path !== "syntax" && (
            <motion.span
              className={`rounded-full bg-surface px-2 py-0.5 text-xs font-mono ${
                isWarning ? "text-warning-fg" : "text-danger-fg"
              }`}
            >
              {error.path}
            </motion.span>
          )}
        </motion.div>
        <motion.p
          className={`break-words text-sm ${isWarning ? "text-warning-fg" : "text-danger-fg"}`}
        >
          {error.message}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}
