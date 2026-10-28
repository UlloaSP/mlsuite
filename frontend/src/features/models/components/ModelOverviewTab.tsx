/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AppBadge } from "@/shared/ui/AppBadge";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { formatTimestamp } from "@/shared/lib/date-time";
import { FeatureImportanceChart } from "@/features/models/components/FeatureImportanceChart";
import { ModelFacts, type ModelFact } from "@/features/models/components/ModelFacts";
import { ModelPipelineSteps } from "@/features/models/components/ModelPipelineSteps";
import { ModelSection } from "@/features/models/components/ModelSection";
import type { ModelManifestView } from "@/features/models/lib/model-manifest";
import type { ModelOutputRow } from "@/features/models/lib/model-schema-rows";
import type { FeatureImportanceDto, ModelDto } from "@/shared/api/openapi.gen";

type Props = {
  manifest: ModelManifestView;
  outputs: ModelOutputRow[];
  /** How the bundle's form fields were made: from the training data, or the default. */
  schemaSource: string | null;
  importances: FeatureImportanceDto[] | null;
  /** Importances are read in the model's environment, so none exist until it is ready. */
  runtimeState: ModelDto["runtimeState"];
};

const FEATURE_NAMES: Record<string, string> = {
  model: "The model's own",
  dataframe: "From the training data; the model takes inputs by position",
  declared: "Declared at export; the model takes inputs by position",
  generated: "None; the model takes inputs by position",
};

const FORM_FIELDS: Record<string, string> = {
  training_data: "Inferred from the training data",
  default: "Default: every feature is a number",
};

export function ModelOverviewTab({
  manifest,
  outputs,
  schemaSource,
  importances,
  runtimeState,
}: Props) {
  const facts: ModelFact[] = [
    { label: "Library", value: manifest.library },
    { label: "Feature names", value: FEATURE_NAMES[manifest.featureOrigin ?? ""] },
    { label: "Form fields", value: FORM_FIELDS[schemaSource ?? ""] },
    { label: "Exported", value: manifest.exportedAt && formatTimestamp(manifest.exportedAt) },
    { label: "Written by", value: manifest.writerVersion && `mlbundle ${manifest.writerVersion}` },
  ].filter((fact) => Boolean(fact.value));

  return (
    <div className="grid gap-x-12 gap-y-8 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-8">
        <ModelSection title={manifest.steps.length > 1 ? "Pipeline" : "Algorithm"}>
          <ModelPipelineSteps steps={manifest.steps} />
        </ModelSection>

        <ModelSection title="Predicts">
          <ul className="border-b border-line">
            {outputs.map((output) => (
              <li
                key={output.position}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line py-2.5"
              >
                <span className="text-sm text-fg">{output.targetName ?? output.label}</span>
                {output.classes.length > 0 ? (
                  output.classes.map((label) => <AppBadge key={label}>{label}</AppBadge>)
                ) : (
                  <span className="text-sm text-fg-muted">A number</span>
                )}
              </li>
            ))}
          </ul>
        </ModelSection>

        <ModelSection title="Bundle">
          <ModelFacts facts={facts} />
        </ModelSection>
      </div>

      <ModelSection
        title="Feature importance"
        note={
          manifest.steps.length > 1
            ? "Read from the model's structure. In a pipeline these are the features its last step receives."
            : "Read from the model's structure."
        }
      >
        {importances && importances.length > 0 ? (
          <FeatureImportanceChart importances={importances} />
        ) : runtimeState !== "READY" ? (
          <AppEmptyState
            compact
            title="Not read yet"
            description="Feature importances appear once the model's environment is prepared."
          />
        ) : (
          <AppEmptyState
            compact
            title="No feature importances"
            description="The bundle carries no structure to read them from for this kind of model."
          />
        )}
      </ModelSection>
    </div>
  );
}
