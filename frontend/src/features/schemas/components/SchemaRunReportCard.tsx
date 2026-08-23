/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppCopy } from "@/shared/ui/AppCopy";
import { AppPanel } from "@/shared/ui/AppPanel";
import { formatDisplayValue } from "@/capabilities/prediction-runtime/data/input-display";
import type { JsonRecord } from "@/features/schemas/api/schema-types";

type Props = {
  label: string;
  kind: string;
  payload?: JsonRecord;
  labels?: string[];
};

const probabilities = (payload?: JsonRecord): number[] =>
  Array.isArray(payload?.probabilities)
    ? payload.probabilities.filter((item): item is number => typeof item === "number")
    : [];

const textContent = (payload?: JsonRecord): string[] => {
  if (typeof payload?.explanation === "string") return [payload.explanation];
  if (typeof payload?.text === "string") return [payload.text];
  return [];
};

export function SchemaRunReportCard({ label, kind, payload, labels = [] }: Props) {
  const probs = probabilities(payload);
  const text = textContent(payload);
  const mainValue = payload?.prediction ?? payload?.value ?? payload?.values;
  return (
    <AppPanel className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">{kind}</p>
      </div>
      {payload ? (
        <>
          {mainValue !== undefined ? (
            <p className="text-2xl font-semibold text-[var(--text-primary)]">
              {Array.isArray(mainValue)
                ? mainValue.map(formatDisplayValue).join(", ")
                : formatDisplayValue(mainValue)}
            </p>
          ) : null}
          {text.map((item) => (
            <p key={item} className="text-sm leading-7 text-[var(--text-primary)]">
              {item}
            </p>
          ))}
          {probs.length > 0 ? (
            <div className="space-y-2">
              {probs.map((probability, index) => (
                <div key={probabilityLabel(payload, labels, index)} className="space-y-1">
                  <div className="flex justify-between text-xs text-[var(--text-secondary)]">
                    <span>{probabilityLabel(payload, labels, index)}</span>
                    <span>{(probability * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 rounded bg-[var(--surface-muted)]">
                    <div
                      className="h-2 rounded bg-[var(--accent-primary)]"
                      style={{ width: `${Math.max(0, Math.min(100, probability * 100))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <AppCopy>No report content returned.</AppCopy>
      )}
    </AppPanel>
  );
}

function probabilityLabel(payload: JsonRecord, labels: string[], index: number): string {
  return String(
    labels[index] ?? (payload.labels as unknown[] | undefined)?.[index] ?? `Class ${index + 1}`,
  );
}
