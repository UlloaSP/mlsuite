/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { AlertTriangle, History, PencilLine, Play, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import {
  AppBadge,
  AppButton,
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSectionTitle,
  AppSelect,
  AppSurface,
} from "../../app/components";
import { useSchema, useSchemaDrafts, useSchemaVersions } from "../../api/schemas/hooks";
import { countVisibleSchemaFields } from "../../algorithms/schema/one-hot-category";
import {
  schemaVersionId,
  selectSchemaVersion,
  sortSchemaVersions,
} from "../../algorithms/schema/version-selection";
import { SchemaCodeViewer } from "../components/SchemaCodeViewer";

const PAGE_SIZE = 5;

const draftTone = (status: string): "warning" | "danger" | "success" =>
  status === "CONFLICT" ? "danger" : status === "PUBLISHED" ? "success" : "warning";

export function SchemaDetailPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: versions = [] } = useSchemaVersions(schemaId);
  const { data: drafts = [] } = useSchemaDrafts(schemaId);
  const [selectedVersionId, setSelectedVersionId] = useState("");
  const [draftPage, setDraftPage] = useState(1);
  const [versionPage, setVersionPage] = useState(1);
  const sortedVersions = useMemo(() => sortSchemaVersions(versions), [versions]);
  const selectedVersion = selectSchemaVersion(sortedVersions, selectedVersionId);
  const inputCount = countVisibleSchemaFields(selectedVersion?.formSchema);
  const reportCount = Array.isArray(selectedVersion?.formSchema.reports)
    ? selectedVersion.formSchema.reports.length
    : 0;
  const schemaCode = selectedVersion ? JSON.stringify(selectedVersion.formSchema, null, 2) : "{}";
  const draftPages = Math.max(1, Math.ceil(drafts.length / PAGE_SIZE));
  const versionPages = Math.max(1, Math.ceil(sortedVersions.length / PAGE_SIZE));
  const draftItems = drafts.slice((draftPage - 1) * PAGE_SIZE, draftPage * PAGE_SIZE);
  const versionItems = sortedVersions.slice((versionPage - 1) * PAGE_SIZE, versionPage * PAGE_SIZE);

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-6 overflow-auto">
        <AppPageHeader
          title={schema?.name ?? "Schema"}
          breadcrumbs={[{ label: "Schemas", to: "/schemas" }, { label: schema?.name ?? "Schema" }]}
          actions={
            schemaId ? (
              <Link to={`/schemas/${encodeURIComponent(schemaId)}/drafts/create`}>
                <AppButton>
                  <Plus size={16} />
                  New change
                </AppButton>
              </Link>
            ) : null
          }
        />
        {selectedVersion ? (
          <AppPanel className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <AppSectionTitle>Current published version</AppSectionTitle>
                <p className="text-sm text-[var(--text-secondary)]">
                  {selectedVersion.name} · v{selectedVersion.version}
                </p>
              </div>
              <AppSelect
                value={schemaVersionId(selectedVersion)}
                onValueChange={setSelectedVersionId}
                options={sortedVersions.map((version) => ({
                  value: schemaVersionId(version),
                  label: `${version.name} · v${version.version}`,
                }))}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded bg-[var(--surface-muted)] p-4">
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{inputCount}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Fields
                </p>
              </div>
              <div className="rounded bg-[var(--surface-muted)] p-4">
                <p className="text-2xl font-semibold text-[var(--text-primary)]">{reportCount}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Reports
                </p>
              </div>
              <div className="rounded bg-[var(--surface-muted)] p-4">
                <p className="text-2xl font-semibold text-[var(--text-primary)]">
                  {selectedVersion.bindings.length}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Models
                </p>
              </div>
            </div>
            <SchemaCodeViewer value={schemaCode} />
          </AppPanel>
        ) : null}
        <AppPanel className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <AppSectionTitle>Unpublished changes</AppSectionTitle>
            <AppBadge
              tone={drafts.some((draft) => draft.status === "CONFLICT") ? "danger" : "neutral"}
            >
              {drafts.length}
            </AppBadge>
          </div>
          <div className="space-y-3">
            {draftItems.map((draft) => (
              <div key={draft.id} className="rounded border border-[var(--border-soft)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-[var(--text-primary)]">{draft.name}</h2>
                      {draft.status === "CONFLICT" ? (
                        <AlertTriangle size={16} className="text-[var(--danger-text)]" />
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      Base v{draft.baseVersion}
                      {draft.bookmark ? ` · ${draft.bookmark}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AppBadge tone={draftTone(draft.status)}>{draft.status}</AppBadge>
                    <Link to={`/schemas/${schemaId}/drafts/${draft.id}`}>
                      <AppButton variant="secondary">
                        <PencilLine size={16} />
                        Edit
                      </AppButton>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {!drafts.length ? (
              <p className="text-sm text-[var(--text-secondary)]">No unpublished changes.</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-4 text-sm text-[var(--text-secondary)]">
            <span>
              Page {draftPage} of {draftPages}
            </span>
            <div className="flex gap-2">
              <AppButton
                variant="secondary"
                disabled={draftPage === 1}
                onClick={() => setDraftPage(draftPage - 1)}
              >
                Previous
              </AppButton>
              <AppButton
                variant="secondary"
                disabled={draftPage === draftPages}
                onClick={() => setDraftPage(draftPage + 1)}
              >
                Next
              </AppButton>
            </div>
          </div>
        </AppPanel>
        <AppPanel className="space-y-4">
          <AppSectionTitle>Version history</AppSectionTitle>
          <div className="space-y-3">
            {versionItems.map((version) => (
              <div key={version.id} className="rounded border border-[var(--border-soft)] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      {version.name} · v{version.version}
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {version.bindings.length} bindings
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      to={`/schemas/${schemaId}/versions/${schemaVersionId(version)}/runs/create`}
                    >
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
                </div>
              </div>
            ))}
            {versions.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)]">No versions yet.</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between border-t border-[var(--border-soft)] pt-4 text-sm text-[var(--text-secondary)]">
            <span>
              Page {versionPage} of {versionPages}
            </span>
            <div className="flex gap-2">
              <AppButton
                variant="secondary"
                disabled={versionPage === 1}
                onClick={() => setVersionPage(versionPage - 1)}
              >
                Previous
              </AppButton>
              <AppButton
                variant="secondary"
                disabled={versionPage === versionPages}
                onClick={() => setVersionPage(versionPage + 1)}
              >
                Next
              </AppButton>
            </div>
          </div>
        </AppPanel>
      </AppSurface>
    </AppPage>
  );
}
