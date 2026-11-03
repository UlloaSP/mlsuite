/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { formatBytes } from "@/shared/lib/format-bytes";
import { formatTimestamp } from "@/shared/lib/date-time";
import { ModelEnvironmentSection } from "@/features/models/components/ModelEnvironmentSection";
import { ModelFacts, type ModelFact } from "@/features/models/components/ModelFacts";
import { ModelSection } from "@/features/models/components/ModelSection";
import type { ModelManifestView } from "@/features/models/lib/model-manifest";
import type { RuntimeEnvironmentDto } from "@/shared/api/openapi.gen";

type Props = {
  manifest: ModelManifestView;
  fileName: string;
  sizeBytes: number;
  sha256: string;
  environment: RuntimeEnvironmentDto;
};

const stated = (facts: ModelFact[]): ModelFact[] => facts.filter((fact) => Boolean(fact.value));

/**
 * Where the model came from (its bundle, the stored file, the machine that trained it) and the
 * environment it runs in here.
 */
export function ModelProvenanceTab({ manifest, fileName, sizeBytes, sha256, environment }: Props) {
  return (
    <div className="grid gap-x-12 gap-y-8 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-8">
        <ModelSection title="Stored file">
          <ModelFacts
            facts={stated([
              { label: "File", value: fileName },
              { label: "Size", value: formatBytes(sizeBytes) },
              { label: "SHA-256", value: sha256, mono: true },
            ])}
          />
        </ModelSection>

        <ModelSection title="Bundle">
          <ModelFacts
            facts={stated([
              { label: "Bundle id", value: manifest.bundleId, mono: true },
              {
                label: "Exported",
                value: manifest.exportedAt && formatTimestamp(manifest.exportedAt),
              },
              {
                label: "Written by",
                value: manifest.writerVersion && `mlbundle ${manifest.writerVersion}`,
              },
              { label: "Format", value: manifest.formatVersion, mono: true },
            ])}
          />
        </ModelSection>

        <ModelSection title="Contents">
          <ModelFacts
            facts={manifest.members.map((member) => ({
              label: member.name,
              value: [
                member.sizeBytes === null ? null : formatBytes(member.sizeBytes),
                member.sha256,
              ]
                .filter(Boolean)
                .join(" · "),
              mono: true,
            }))}
          />
        </ModelSection>
      </div>

      <div className="flex min-w-0 flex-col gap-8">
        <ModelEnvironmentSection environment={environment} />

        <ModelSection
          title="Training environment"
          note="Declared by whoever exported the bundle. It is not checked against the model."
        >
          <ModelFacts
            facts={stated([
              { label: "Python", value: manifest.python },
              { label: "System", value: manifest.platform },
              ...manifest.packages.map((item) => ({
                label: item.name,
                value: item.version,
                mono: true,
              })),
            ])}
          />
        </ModelSection>

        {manifest.userMetadata.length > 0 ? (
          <ModelSection title="Author's notes" note="Free-form metadata added at export.">
            <ModelFacts
              facts={manifest.userMetadata.map((item) => ({ label: item.key, value: item.value }))}
            />
          </ModelSection>
        ) : null}
      </div>
    </div>
  );
}
