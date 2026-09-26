/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { countVisibleSchemaFields } from "@/features/schemas/lib/one-hot-category";
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
    <section className="flex min-h-[640px] shrink-0 flex-col gap-4 overflow-hidden lg:min-h-0 lg:flex-1">
      <div className="grid shrink-0 items-center gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(280px,0.9fr)_auto]">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-fg">{version.name}</h2>
          <p className="mt-1 text-sm text-fg-secondary">
            v{version.version} · Published <LiveRelativeTime value={version.createdAt} /> ago
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            ["Fields", fieldCount],
            ["Reports", reportCount],
            ["Bindings", version.bindings.length],
          ].map(([label, value]) => (
            <div key={label} className="rounded-control bg-surface-muted px-3 py-2">
              <p className="text-lg font-semibold leading-5 text-fg">{value}</p>
              <p className="text-3xs uppercase tracking-[0.14em] text-fg-secondary">{label}</p>
            </div>
          ))}
        </div>
        <div
          className="inline-flex overflow-hidden rounded-control border border-line bg-surface p-1 shadow-card lg:justify-self-end"
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
                    ? "bg-accent text-on-accent shadow-card"
                    : "text-fg hover:bg-surface-muted",
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
              <div key={binding.id ?? binding.modelId} className="rounded border border-line p-3">
                <p className="font-semibold text-fg">{binding.modelName ?? binding.modelId}</p>
                <p className="mt-1 font-mono text-xs text-fg-secondary">
                  {binding.pluginPolicy ? JSON.stringify(binding.pluginPolicy) : binding.modelId}
                </p>
              </div>
            ))}
            {!version.bindings.length ? (
              <p className="text-sm text-fg-secondary">No model bindings in this snapshot.</p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
