/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

const TRACE_STAGES = [
  { label: "Artifact", value: "Exact model identity" },
  { label: "Schema", value: "Versioned contract" },
  { label: "Prediction", value: "Inputs and outputs" },
  { label: "Feedback", value: "Human review attached" },
] as const;

export function AuthTrace() {
  return (
    <div className="bg-[color-mix(in_srgb,var(--surface-muted)_88%,transparent)]">
      <ol className="grid sm:grid-cols-2 lg:grid-cols-4">
        {TRACE_STAGES.map((stage, index) => (
          <li
            key={stage.label}
            className="min-w-0 border-b border-[var(--border-strong)] px-5 py-5 last:border-b-0 sm:border-r sm:px-8 sm:[&:nth-child(2n)]:border-r-0 sm:[&:nth-child(n+3)]:border-b-0 lg:border-b-0 lg:px-5 lg:[&:nth-child(2n)]:border-r lg:last:border-r-0 xl:px-6"
          >
            <div className="mb-4 flex items-center gap-3" aria-hidden="true">
              <span className="font-mono text-[0.65rem] text-[var(--accent-primary-strong)]">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="h-px flex-1 bg-[var(--border-strong)]" />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{stage.label}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">{stage.value}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
