/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AlertCircle } from "lucide-react";
import type { EditorErrorCard as EditorDiagnostic } from "@/features/schemas/lib/schema-diagnostics";

type EditorErrorCardProps = {
  error: EditorDiagnostic;
};

export function EditorErrorCard({ error }: EditorErrorCardProps) {
  const isWarning = error.severity === "warning";
  return (
    <div
      className={`flex space-x-3 rounded-card border p-4 ${
        isWarning
          ? "border-warning-subtle bg-warning-subtle"
          : "border-danger-subtle bg-danger-subtle"
      }`}
    >
      <AlertCircle
        size={16}
        className={`mt-0.5 ${isWarning ? "text-warning-fg" : "text-danger-fg"}`}
      />
      <div>
        <div className="flex items-center gap-x-2 mb-1">
          <span
            className={`text-sm font-semibold ${isWarning ? "text-warning-fg" : "text-danger-fg"}`}
          >
            Line {error.line}:{error.column}
          </span>
          {error.path !== "syntax" && (
            <span
              className={`rounded-full bg-surface px-2 py-0.5 text-xs font-mono ${
                isWarning ? "text-warning-fg" : "text-danger-fg"
              }`}
            >
              {error.path}
            </span>
          )}
        </div>
        <p className={`break-words text-sm ${isWarning ? "text-warning-fg" : "text-danger-fg"}`}>
          {error.message}
        </p>
      </div>
    </div>
  );
}
