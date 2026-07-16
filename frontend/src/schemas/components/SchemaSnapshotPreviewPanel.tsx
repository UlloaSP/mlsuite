/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import type { SchemaVersionDto } from "../../api/schemas/dtos";
import { LiveRelativeTime } from "../../app/components/LiveRelativeTime";
import { countVisibleSchemaFields } from "../../algorithms/schema/one-hot-category";
import { SchemaCodeViewer } from "./SchemaCodeViewer";
import { SchemaFormPreview } from "./SchemaFormPreview";

type PreviewMode = "form" | "json" | "bindings";

type Props = {
  version: SchemaVersionDto;
};

export function SchemaSnapshotPreviewPanel({ version }: Props) {
  const [mode, setMode] = useState<PreviewMode>("form");
  const fieldCount = countVisibleSchemaFields(version.formSchema);
  const reportCount = Array.isArray(version.formSchema.reports)
    ? version.formSchema.reports.length
    : 0;

  return (
    <section className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 items-center gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(280px,0.9fr)_auto]">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">{version.name}</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            v{version.version} · Published <LiveRelativeTime value={version.createdAt} /> ago
          </p>
        </div>
        <div className="grid gap-1.5 sm:grid-cols-3">
          {[
            ["Fields", fieldCount],
            ["Reports", reportCount],
            ["Bindings", version.bindings.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded bg-[var(--surface-muted)] px-3 py-2">
              <p className="text-lg font-semibold leading-5 text-[var(--text-primary)]">{value}</p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--text-secondary)]">
                {label}
              </p>
            </div>
          ))}
        </div>
        <div
          className="inline-flex overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-1 shadow-sm lg:justify-self-end"
          role="group"
          aria-label="Snapshot preview mode"
        >
          {(["form", "json", "bindings"] as const).map((item) => {
            const selected = mode === item;
            return (
              <button
                key={item}
                type="button"
                aria-pressed={selected}
                className={[
                  "rounded px-4 py-2 text-sm font-semibold transition",
                  selected
                    ? "bg-[#FF385C] text-white shadow-sm"
                    : "text-[var(--text-primary)] hover:bg-[var(--surface-muted)]",
                ].join(" ")}
                onClick={() => setMode(item)}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <div
          className={
            mode === "form"
              ? "size-full min-h-0 overflow-hidden"
              : "hidden size-full min-h-0 overflow-hidden"
          }
        >
          <SchemaFormPreview schema={version.formSchema} />
        </div>
        {mode === "json" ? (
          <SchemaCodeViewer
            className="size-full min-h-0"
            value={JSON.stringify(version.formSchema, null, 2)}
          />
        ) : null}
        {mode === "bindings" ? (
          <div className="size-full space-y-2 overflow-auto">
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
      </div>
    </section>
  );
}
