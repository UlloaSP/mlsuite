/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useState } from "react";
import type { SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { AppSegmentedControl } from "@/shared/ui/AppSegmentedControl";
import { cx } from "@/shared/ui/cx";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { countVisibleSchemaFields } from "@/features/schemas/lib/one-hot-category";
import { SchemaCodeViewer } from "./SchemaCodeViewer";
import { SchemaFormPreview } from "./SchemaFormPreview";

type PreviewMode = "form" | "json" | "bindings";

const PREVIEW_MODES = [
  { value: "form", label: "Form" },
  { value: "json", label: "JSON" },
  { value: "bindings", label: "Bindings" },
] as const;

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
    <section className="flex shrink-0 flex-col gap-4 lg:min-h-0 lg:flex-1 lg:overflow-hidden">
      <div className="grid shrink-0 items-center gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(280px,0.9fr)_auto]">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-fg">{version.name}</h2>
          <p className="mt-1 text-sm text-fg-secondary">
            v{version.version} · Published <LiveRelativeTime value={version.createdAt} /> ago
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {[
            ["Fields", fieldCount],
            ["Reports", reportCount],
            ["Bindings", version.bindings.length],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex flex-col-reverse rounded-card border border-line px-3 py-2"
            >
              <dt className="text-2xs font-semibold uppercase tracking-eyebrow text-fg-secondary">
                {label}
              </dt>
              <dd className="text-lg font-semibold leading-6 text-fg">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="lg:justify-self-end">
          <AppSegmentedControl
            label="Snapshot preview mode"
            options={PREVIEW_MODES}
            value={mode}
            onChange={setMode}
            size="md"
          />
        </div>
      </div>
      <div className="lg:min-h-0 lg:flex-1 lg:overflow-hidden">
        {/* Hidden, not unmounted: the MLForm runtime keeps its inputs across modes. */}
        <div className={cx("size-full lg:min-h-0 lg:overflow-hidden", mode !== "form" && "hidden")}>
          <SchemaFormPreview schema={version.formSchema} />
        </div>
        {mode === "json" ? (
          <SchemaCodeViewer
            className="h-[calc(100dvh-var(--app-nav-block,0px)-6rem)] min-h-80 lg:h-full lg:min-h-0"
            value={JSON.stringify(version.formSchema, null, 2)}
          />
        ) : null}
        {mode === "bindings" ? (
          <div className="flex size-full flex-col gap-2 lg:overflow-auto">
            {version.bindings.map((binding) => (
              <div
                key={binding.id ?? binding.modelId}
                className="rounded-card border border-line p-3"
              >
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
