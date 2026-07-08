/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import type { SchemaVersionDto } from "../../api/schemas/dtos";
import { AppBadge, AppButton, AppPanel, AppSectionTitle } from "../../app/components";
import { countVisibleSchemaFields } from "../../algorithms/schema/one-hot-category";
import { SchemaCodeViewer } from "./SchemaCodeViewer";
import { SchemaFormPreview } from "./SchemaFormPreview";

type PreviewMode = "form" | "json" | "bindings";

type Props = {
  version: SchemaVersionDto;
};

export function SchemaSnapshotPreviewPanel({ version }: Props) {
  const [mode, setMode] = useState<PreviewMode>("form");
  const reportCount = Array.isArray(version.formSchema.reports)
    ? version.formSchema.reports.length
    : 0;

  return (
    <AppPanel className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <AppSectionTitle>Snapshot document</AppSectionTitle>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            {version.name} · v{version.version}
          </p>
        </div>
        <AppBadge tone="neutral">read-only</AppBadge>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Fields", countVisibleSchemaFields(version.formSchema)],
          ["Reports", reportCount],
          ["Bindings", version.bindings.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded bg-[var(--surface-muted)] p-4">
            <p className="text-2xl font-semibold text-[var(--text-primary)]">{value}</p>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              {label}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {(["form", "json", "bindings"] as const).map((item) => (
          <AppButton
            key={item}
            variant={mode === item ? "primary" : "secondary"}
            onClick={() => setMode(item)}
          >
            {item}
          </AppButton>
        ))}
      </div>
      {mode === "form" ? (
        <div className="h-[560px] min-h-0">
          <SchemaFormPreview schema={version.formSchema} />
        </div>
      ) : null}
      {mode === "json" ? (
        <SchemaCodeViewer value={JSON.stringify(version.formSchema, null, 2)} />
      ) : null}
      {mode === "bindings" ? (
        <div className="space-y-2">
          {version.bindings.map((binding) => (
            <div
              key={binding.id ?? binding.modelId}
              className="rounded border border-[var(--border-soft)] p-3"
            >
              <p className="font-semibold text-[var(--text-primary)]">
                {binding.modelName ?? binding.modelId}
              </p>
              <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
                {binding.pluginPolicy ? JSON.stringify(binding.pluginPolicy) : binding.modelId}
              </p>
            </div>
          ))}
          {!version.bindings.length ? (
            <p className="text-sm text-[var(--text-secondary)]">
              No model bindings in this snapshot.
            </p>
          ) : null}
        </div>
      ) : null}
    </AppPanel>
  );
}
