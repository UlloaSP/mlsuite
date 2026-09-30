/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { toExecutableSchemaVersion } from "@/capabilities/prediction-runtime/mlform/executable-schema";
import { mergeSchemaRunInputs } from "@/capabilities/prediction-runtime/data/input-display";
import { useSchemaPluginCatalog } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useSchemaVersion } from "@/features/schemas/api/schema-queries";
import { SchemaRunInputsPanel } from "./SchemaRunInputsPanel";
import { SchemaRunReportsPanel } from "./SchemaRunReportsPanel";
import type { SessionEntry } from "@/features/schemas/lib/use-inference-session";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = { entry: SessionEntry; currentVersion: SchemaVersionDto };

export function InferenceSessionResultPreview({ entry, currentVersion }: Props) {
  const matches = entry.schemaVersionId === currentVersion.id;
  const snapshot = useSchemaVersion(matches ? undefined : entry.schemaVersionId);
  const version = matches
    ? currentVersion
    : snapshot.data
      ? toExecutableSchemaVersion(snapshot.data)
      : undefined;
  const catalog = useSchemaPluginCatalog(version?.formSchema, useCurrentOrganizationId() ?? "none");

  if (!version) {
    return snapshot.isError ? (
      <AppInlineAlert>Could not load this inference&apos;s schema snapshot.</AppInlineAlert>
    ) : (
      <AppLoadingState label="Loading inference snapshot…" rows={3} />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SchemaRunReportsPanel
        version={version}
        results={entry.results}
        customReportDefinitions={catalog.data.reportDefinitions}
      />
      <details className="border-t border-line pt-4">
        <summary
          className={`cursor-pointer rounded-control text-sm font-semibold text-fg ${FOCUS_RING}`}
        >
          Inputs
        </summary>
        <div className="pt-4">
          <SchemaRunInputsPanel
            schema={version.formSchema}
            inputData={mergeSchemaRunInputs(entry.inputData, entry.results)}
          />
        </div>
      </details>
    </div>
  );
}
