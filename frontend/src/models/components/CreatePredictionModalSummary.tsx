/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Save } from "lucide-react";
import { AppButton, AppPanel, AppSectionTitle, AppTextField } from "../../app/components";
import {
  formatProbability,
  getSchemaAwareTargetValue,
  getTargetLabel,
  getTargetProbability,
} from "../target-utils";

type CreatePredictionModalSummaryProps = {
  outputType?: string;
  executionTime?: number | string;
  inputs: Record<string, unknown>;
  targets: Record<number, unknown>;
  signatureSchema: unknown;
  predictionName: string;
  onPredictionNameChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
  isSaveDisabled: boolean;
};

const formatInputValue = (value: unknown) =>
  typeof value === "number" ? value.toLocaleString() : String(value);

export function CreatePredictionModalSummary({
  outputType,
  executionTime,
  inputs,
  targets,
  signatureSchema,
  predictionName,
  onPredictionNameChange,
  onCancel,
  onSave,
  isSaveDisabled,
}: CreatePredictionModalSummaryProps) {
  return (
    <div className="space-y-8">
      <AppPanel className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-secondary)]">Type:</span>
          <span className="font-mono font-medium text-[var(--text-primary)]">
            {outputType || "N/A"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-[var(--text-secondary)]">
            Execution Time:
          </span>
          <span className="font-mono font-medium text-[var(--text-primary)]">
            {executionTime || "N/A"}
          </span>
        </div>
      </AppPanel>

      <AppPanel className="space-y-4">
        <AppSectionTitle>Input Features</AppSectionTitle>
        <div className="space-y-3">
          {Object.entries(inputs).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-[20px] bg-[var(--surface-muted)] p-3"
            >
              <span className="text-sm font-medium text-[var(--text-secondary)]">{key}:</span>
              <span className="font-mono text-sm text-[var(--text-primary)]">
                {formatInputValue(value)}
              </span>
            </div>
          ))}
        </div>
      </AppPanel>

      <AppPanel className="space-y-4">
        <AppSectionTitle>Targets</AppSectionTitle>
        <div className="space-y-3">
          {Object.entries(targets).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-[20px] bg-[var(--surface-muted)] p-3"
            >
              <span className="text-sm font-medium text-[var(--text-secondary)]">
                {getTargetLabel(signatureSchema, Number(key))}:
              </span>
              <span className="font-mono text-sm text-[var(--text-primary)]">
                {String(getSchemaAwareTargetValue(value, signatureSchema, Number(key)))}
              </span>
              {getTargetProbability(value) !== null ? (
                <span className="font-mono text-xs text-[var(--text-muted)]">
                  {formatProbability(getTargetProbability(value)!)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      </AppPanel>

      <AppPanel className="space-y-4 p-6">
        <AppSectionTitle>Prediction Name</AppSectionTitle>
        <AppTextField
          id="prediction-name"
          type="text"
          value={predictionName}
          onChange={(event) => onPredictionNameChange(event.target.value)}
          placeholder="Ex: Customer Churn v2.0"
          className="w-full"
        />
        <div className="flex gap-4 pt-2">
          <AppButton onClick={onCancel} variant="secondary" className="flex-1">
            Cancel
          </AppButton>
          <AppButton onClick={onSave} disabled={isSaveDisabled} className="flex-1">
            <Save size={18} />
            <span>Save Prediction</span>
          </AppButton>
        </div>
      </AppPanel>
    </div>
  );
}
