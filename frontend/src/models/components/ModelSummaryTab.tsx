/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge, AppButton, AppCopy, AppPanel, AppSectionTitle } from "../../app/components";
import type { ModelDto } from "../api/modelService";
import { formatTimestamp, getModelAlgorithmLabel } from "../utils";

type ModelSummaryTabProps = {
  model: ModelDto;
  onCreateSchema: () => void;
};

export function ModelSummaryTab({ model, onCreateSchema }: ModelSummaryTabProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <AppPanel className="space-y-4">
        <AppSectionTitle>Model Metadata</AppSectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Type</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {getModelAlgorithmLabel(model)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">File</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">{model.fileName}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Created</p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {formatTimestamp(model.createdAt)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Schema fields
            </p>
            <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
              {Array.isArray(model.inputSchema.fields) ? model.inputSchema.fields.length : 0}
            </p>
          </div>
        </div>
      </AppPanel>

      <AppPanel className="space-y-4">
        <AppSectionTitle>Operational Status</AppSectionTitle>
        <AppBadge tone="success">active</AppBadge>
        <AppCopy>Model is available for schema creation and prediction workflows.</AppCopy>
      </AppPanel>

      <AppPanel className="space-y-4 xl:col-span-2">
        <AppSectionTitle>Schema</AppSectionTitle>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <AppCopy>Create a schema from this model snapshot.</AppCopy>
          <AppButton type="button" variant="secondary" onClick={onCreateSchema}>
            Create Schema
          </AppButton>
        </div>
      </AppPanel>
    </div>
  );
}
