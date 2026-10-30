/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMemo } from "react";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppTabPanel, AppTabs } from "@/shared/ui/AppTabs";
import { formatBytes } from "@/shared/lib/format-bytes";
import { formatTimestamp } from "@/shared/lib/date-time";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { ModelInputsTab } from "@/features/models/components/ModelInputsTab";
import { ModelOutputsTab } from "@/features/models/components/ModelOutputsTab";
import { ModelOverviewTab } from "@/features/models/components/ModelOverviewTab";
import { ModelParametersTab } from "@/features/models/components/ModelParametersTab";
import { ModelProvenanceTab } from "@/features/models/components/ModelProvenanceTab";
import { readModelManifest } from "@/features/models/lib/model-manifest";
import { readModelInputs, readModelOutputs } from "@/features/models/lib/model-schema-rows";
import type { ModelDetailsDto, ModelDto } from "@/shared/api/openapi.gen";

const TABS = ["overview", "inputs", "outputs", "parameters", "provenance"] as const;
type Tab = (typeof TABS)[number];

const counted = (count: number, one: string, many: string) =>
  `${count} ${count === 1 ? one : many}`;

type Props = {
  model: ModelDto;
  /** Absent when the bundle's details could not be loaded. */
  details: ModelDetailsDto | undefined;
};

/** Everything a model's bundle says about it, one linkable tab per question. */
export function ModelDetailTabs({ model, details }: Props) {
  const [tab, setTab] = useSearchParamState<Tab>("tab", "overview", TABS);
  const manifest = useMemo(() => readModelManifest(details?.manifest), [details?.manifest]);
  const inputs = useMemo(
    () => readModelInputs(model.inputSchema, manifest),
    [manifest, model.inputSchema],
  );
  const outputs = useMemo(
    () => readModelOutputs(model.inputSchema, manifest),
    [manifest, model.inputSchema],
  );
  const schemaSource =
    isRecord(model.inputSchema) && typeof model.inputSchema.source === "string"
      ? model.inputSchema.source
      : null;
  const classes = outputs.flatMap((output) => output.classes).length;

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-y border-line py-4 text-sm text-fg-secondary">
        <AppBadge tone="accent">{model.type}</AppBadge>
        {manifest.library ? <span>{manifest.library}</span> : null}
        <span>{counted(inputs.length, "input", "inputs")}</span>
        <span>
          {counted(outputs.length, "output", "outputs")}
          {classes > 0 ? `, ${counted(classes, "class", "classes")}` : ""}
        </span>
        <span>
          <span className="text-fg-muted">File</span> {model.fileName}
          {details ? ` (${formatBytes(details.sizeBytes)})` : ""}
        </span>
        <span>
          <span className="text-fg-muted">Updated</span> {formatTimestamp(model.updatedAt)} by{" "}
          {model.updatedByName}
        </span>
      </div>

      {!details ? (
        <AppEmptyState
          compact
          title="Bundle details unavailable"
          description="What the model's bundle says about it could not be loaded. Try again in a moment."
        />
      ) : manifest.steps.length === 0 ? (
        <AppEmptyState
          compact
          title="No bundle details"
          description="This model was stored before MLsuite kept what its bundle says about it. Upload its .mlbundle again to see it here."
        />
      ) : (
        <AppTabs
          aria-label="Model details"
          items={[
            { label: "Overview", value: "overview" },
            { label: "Inputs", value: "inputs", count: inputs.length },
            { label: "Outputs", value: "outputs", count: outputs.length },
            { label: "Parameters", value: "parameters", count: manifest.parameters.length },
            { label: "Provenance", value: "provenance" },
          ]}
          value={tab}
          onChange={setTab}
        >
          <AppTabPanel value={tab}>
            {tab === "overview" ? (
              <ModelOverviewTab
                manifest={manifest}
                outputs={outputs}
                schemaSource={schemaSource}
                importances={details.featureImportances}
                runtimeState={model.runtimeState}
              />
            ) : tab === "inputs" ? (
              <ModelInputsTab inputs={inputs} />
            ) : tab === "outputs" ? (
              <ModelOutputsTab outputs={outputs} />
            ) : tab === "parameters" ? (
              <ModelParametersTab parameters={manifest.parameters} />
            ) : (
              <ModelProvenanceTab
                manifest={manifest}
                fileName={model.fileName}
                sizeBytes={details.sizeBytes}
                sha256={details.sha256}
                environment={details.environment}
              />
            )}
          </AppTabPanel>
        </AppTabs>
      )}
    </>
  );
}
