/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect } from "react";
import { AppButton, AppCopy, AppPanel, AppSectionTitle } from "../../app/components";

type PredictionOverwriteDialogProps = {
  open: boolean;
  predictionName: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PredictionOverwriteDialog({
  open,
  predictionName,
  onCancel,
  onConfirm,
}: PredictionOverwriteDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 p-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onCancel} />
      <AppPanel className="relative z-10 w-full max-w-lg space-y-5 p-6">
        <div className="space-y-2">
          <AppSectionTitle>Overwrite prediction?</AppSectionTitle>
          <AppCopy>
            Prediction{" "}
            <span className="font-semibold text-[var(--text-primary)]">{predictionName}</span>{" "}
            already exists. Save will replace prediction data and targets.
          </AppCopy>
        </div>
        <div className="flex justify-end gap-3">
          <AppButton type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </AppButton>
          <AppButton type="button" onClick={onConfirm}>
            Overwrite
          </AppButton>
        </div>
      </AppPanel>
    </div>
  );
}
