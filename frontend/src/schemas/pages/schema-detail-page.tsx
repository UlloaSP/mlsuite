/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Code2, History, Play, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSectionTitle,
  AppSurface,
} from "../../app/components/ui";
import { AppButton, AppSelect } from "../../app/components/ui-controls";
import { useSchema, useSchemaVersions } from "../hooks";
import { countVisibleSchemaFields } from "../one-hot-schema";
import {
  schemaVersionId,
  selectSchemaVersion,
  sortSchemaVersions,
} from "../schema-version-selection";

export function SchemaDetailPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: versions = [] } = useSchemaVersions(schemaId);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const sortedVersions = useMemo(() => sortSchemaVersions(versions), [versions]);
  const selectedVersion = selectSchemaVersion(sortedVersions, selectedVersionId);
  const inputCount = countVisibleSchemaFields(selectedVersion?.formSchema);
  const reportCount = Array.isArray(selectedVersion?.formSchema.reports)
    ? selectedVersion.formSchema.reports.length
    : 0;
  const schemaCode = selectedVersion ? JSON.stringify(selectedVersion.formSchema, null, 2) : "{}";

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-6 overflow-auto">
        <AppPageHeader
          title={schema?.name ?? "Schema"}
          backHref="/schemas"
          aside={
            schemaId ? (
              <Link to={`/schemas/${encodeURIComponent(schemaId)}/versions/create`}>
                <AppButton>
                  <Plus size={16} />
                  New version
                </AppButton>
              </Link>
            ) : null
          }
        />
        {selectedVersion ? (
          <AppPanel className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <AppSectionTitle>Schema code</AppSectionTitle>
                <p className="text-sm text-[var(--text-secondary)]">
                  {selectedVersion.name} · v{selectedVersion.version}
                </p>
              </div>
              <AppSelect
                value={schemaVersionId(selectedVersion)}
                onChange={(event) => setSelectedVersionId(event.target.value)}
              >
                {sortedVersions.map((version) => (
                  <option key={schemaVersionId(version)} value={schemaVersionId(version)}>
                    {version.name} · v{version.version}
                  </option>
                ))}
              </AppSelect>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[18px] bg-[var(--surface-muted)] p-4">
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{inputCount}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Fields
                </p>
              </div>
              <div className="rounded-[18px] bg-[var(--surface-muted)] p-4">
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{reportCount}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Reports
                </p>
              </div>
              <div className="rounded-[18px] bg-[var(--surface-muted)] p-4">
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {selectedVersion.bindings.length}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Models
                </p>
              </div>
            </div>
            <pre className="max-h-[480px] overflow-auto rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4 text-xs leading-5 text-[var(--text-primary)]">
              <code>
                <Code2 className="mb-3 inline-block text-[var(--text-secondary)]" size={16} />
                {"\n"}
                {schemaCode}
              </code>
            </pre>
          </AppPanel>
        ) : null}
        <div className="space-y-4">
          <AppSectionTitle>Versions</AppSectionTitle>
          {sortedVersions.map((version) => (
            <AppPanel key={version.id} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                    {version.name} · v{version.version}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {version.bindings.length} bindings
                  </p>
                </div>
                <Link to={`/schemas/${schemaId}/versions/${schemaVersionId(version)}/runs/create`}>
                  <AppButton>
                    <Play size={16} />
                    Run
                  </AppButton>
                </Link>
                <Link to={`/schemas/${schemaId}/versions/${schemaVersionId(version)}/runs`}>
                  <AppButton variant="secondary">
                    <History size={16} />
                    Inference history
                  </AppButton>
                </Link>
              </div>
            </AppPanel>
          ))}
          {versions.length === 0 ? <AppPanel>No versions yet.</AppPanel> : null}
        </div>
      </AppSurface>
    </AppPage>
  );
}
