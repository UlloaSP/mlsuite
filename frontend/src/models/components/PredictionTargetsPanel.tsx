/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown, ChevronUp } from "lucide-react";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components/ui";
import type { TargetDto } from "../api/modelService";
import {
  formatProbability,
  getSchemaAwareTargetValue,
  getTargetLabel,
  getTargetProbability,
} from "../target-utils";

type PredictionTargetsPanelProps = {
  open: boolean;
  onToggle: () => void;
  targets: TargetDto[];
  signatureSchema?: unknown;
  predictionValue?: unknown;
};

export function PredictionTargetsPanel({
  open,
  onToggle,
  targets,
  signatureSchema,
  predictionValue,
}: PredictionTargetsPanelProps) {
  return (
    <AppPanel className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <AppSectionTitle>Output Targets</AppSectionTitle>
          <AppCopy>Predicted target values returned by the model.</AppCopy>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open ? (
        <div className="grid gap-3 md:grid-cols-2">
          {targets.map((target) => (
            <div key={target.id} className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                {getTargetLabel(signatureSchema, target.order)}
              </p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
                {String(
                  getSchemaAwareTargetValue(
                    target.value,
                    signatureSchema,
                    target.order,
                    predictionValue,
                  ) ?? "",
                )}
              </p>
              {getTargetProbability(target.value) !== null ? (
                <p className="mt-1 font-mono text-xs text-[var(--text-muted)]">
                  Probability {formatProbability(getTargetProbability(target.value)!)}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </AppPanel>
  );
}
