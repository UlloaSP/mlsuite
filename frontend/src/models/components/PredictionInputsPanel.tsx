/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ChevronDown, ChevronUp } from "lucide-react";
import { AppCopy, AppPanel, AppSectionTitle } from "../../app/components/ui";

type PredictionInputsPanelProps = {
  open: boolean;
  onToggle: () => void;
  inputs: Record<string, unknown>;
};

export function PredictionInputsPanel({ open, onToggle, inputs }: PredictionInputsPanelProps) {
  return (
    <AppPanel className="space-y-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between text-left"
      >
        <div>
          <AppSectionTitle>Input Features</AppSectionTitle>
          <AppCopy>Source payload used for this prediction.</AppCopy>
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(inputs).map(([key, value]) => (
            <div key={key} className="rounded-[18px] bg-[var(--surface-muted)] px-4 py-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{key}</p>
              <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
                {typeof value === "number" ? value.toLocaleString() : String(value)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </AppPanel>
  );
}
