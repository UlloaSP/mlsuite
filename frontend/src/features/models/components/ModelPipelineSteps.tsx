/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronRight } from "lucide-react";
import { cx } from "@/shared/ui/cx";
import type { PipelineStep } from "@/features/models/lib/model-manifest";

/** The model's steps in the order a row goes through them; the last one predicts. */
export function ModelPipelineSteps({ steps }: { steps: PipelineStep[] }) {
  return (
    <ol className="flex flex-wrap items-stretch gap-x-1 gap-y-2">
      {steps.map((step, index) => {
        const predicts = index === steps.length - 1;
        return (
          <li key={`${step.name}-${step.algorithm}`} className="flex items-center gap-1">
            {index > 0 ? (
              <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-fg-muted" />
            ) : null}
            <div
              className={cx(
                "rounded-control border px-3 py-2",
                predicts ? "border-accent-border bg-accent-subtle" : "border-line bg-surface",
              )}
            >
              <p className="text-sm font-semibold text-fg">{step.algorithm}</p>
              <p className="mt-0.5 text-xs text-fg-secondary">
                {step.name ? <span className="font-mono">{step.name}</span> : null}
                {step.name && predicts ? " · " : null}
                {predicts ? "predicts" : null}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
