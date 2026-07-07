/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RefreshCcw, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  AppBadge,
  AppButton,
  AppCopy,
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSectionTitle,
  AppSelect,
  AppSurface,
  AppTextField,
} from "../../app/components";
import {
  useCreateSchemaDraftMutation,
  useSchema,
  useSchemaVersions,
} from "../../api/schemas/hooks";
import {
  schemaVersionId,
  selectSchemaVersion,
  sortSchemaVersions,
} from "../../algorithms/schema/version-selection";
import { countVisibleSchemaFields } from "../../algorithms/schema/one-hot-category";
import { SchemaCodeViewer } from "../components/SchemaCodeViewer";
import { SchemaFormPreview } from "../components/SchemaFormPreview";

type PreviewMode = "form" | "json" | "bindings";

export function CreateSchemaVersionPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const navigate = useNavigate();
  const { data: schemaDto } = useSchema(schemaId);
  const { data: versions = [] } = useSchemaVersions(schemaId);
  const mutation = useCreateSchemaDraftMutation(schemaId ?? "");
  const [baseVersionId, setBaseVersionId] = useState("");
  const [name, setName] = useState("Update schema");
  const [bookmark, setBookmark] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("form");

  const sortedVersions = useMemo(() => sortSchemaVersions(versions), [versions]);
  const effectiveBaseId = baseVersionId || schemaVersionId(sortedVersions[0]);
  const baseVersion = selectSchemaVersion(sortedVersions, effectiveBaseId);
  const latestVersionId = schemaVersionId(sortedVersions[0]);
  const isOlderBase = Boolean(baseVersion && effectiveBaseId !== latestVersionId);
  const schemaCode = baseVersion ? JSON.stringify(baseVersion.formSchema, null, 2) : "{}";
  const fieldCount = countVisibleSchemaFields(baseVersion?.formSchema);
  const reportCount = Array.isArray(baseVersion?.formSchema.reports)
    ? baseVersion.formSchema.reports.length
    : 0;
  const canCreate = Boolean(schemaId && baseVersion && name.trim());

  const create = async () => {
    if (!schemaId || !baseVersion || !canCreate) return;
    try {
      const draft = await mutation.mutateAsync({
        name: name.trim(),
        baseVersionId: schemaVersionId(baseVersion),
        bookmark: bookmark.trim() || undefined,
      });
      void navigate(`/schemas/${schemaId}/drafts/${draft.id}`);
    } catch (error) {
      toast.error("Schema change creation failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title="New schema change"
          description={schemaDto ? `${schemaDto.name} unpublished work` : "Unpublished work"}
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId
              ? [{ label: schemaDto?.name ?? "Schema", to: `/schemas/${schemaId}` }]
              : []),
            { label: "New change" },
          ]}
        />
        <div className="grid min-h-0 gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <AppPanel className="space-y-5">
            <div className="space-y-2">
              <AppSectionTitle>Start from</AppSectionTitle>
              <AppCopy>Pick the published version this change will use as its base.</AppCopy>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="base-version"
                className="text-sm font-semibold text-[var(--text-primary)]"
              >
                Base version
              </label>
              <AppSelect
                id="base-version"
                value={effectiveBaseId}
                onValueChange={setBaseVersionId}
                disabled={!sortedVersions.length}
                className="w-full"
                options={
                  sortedVersions.length
                    ? sortedVersions.map((version) => ({
                        value: schemaVersionId(version),
                        label: `${version.name} · v${version.version}`,
                      }))
                    : [{ value: "", label: "No versions available" }]
                }
              />
            </div>
            {isOlderBase ? (
              <div className="rounded border border-[var(--warning-border)] bg-[var(--warning-quiet)] p-3 text-sm text-[var(--warning-text)]">
                This starts from an older version. Publishing may require conflict review.
              </div>
            ) : null}
            <div className="space-y-2">
              <label
                htmlFor="change-name"
                className="text-sm font-semibold text-[var(--text-primary)]"
              >
                Change name
              </label>
              <AppTextField
                id="change-name"
                value={name}
                placeholder="Normalize ICU hours"
                onChange={(event) => setName(event.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="bookmark"
                className="text-sm font-semibold text-[var(--text-primary)]"
              >
                Bookmark
              </label>
              <AppTextField
                id="bookmark"
                value={bookmark}
                placeholder="schema/icu-hours"
                onChange={(event) => setBookmark(event.target.value)}
                className="w-full"
              />
            </div>
            <AppButton
              className="w-full justify-center"
              onClick={create}
              disabled={!canCreate || mutation.isPending}
            >
              {mutation.isPending ? (
                <>
                  <span className="animate-spin">
                    <RefreshCcw size={18} />
                  </span>
                  Creating...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Create change
                </>
              )}
            </AppButton>
          </AppPanel>
          <AppPanel className="min-h-0 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <AppSectionTitle>Base preview</AppSectionTitle>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {baseVersion ? `${baseVersion.name} · v${baseVersion.version}` : "No version"}
                </p>
              </div>
              {baseVersion ? <AppBadge tone="neutral">published</AppBadge> : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded bg-[var(--surface-muted)] p-3">
                <p className="text-xl font-semibold text-[var(--text-primary)]">{fieldCount}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Fields
                </p>
              </div>
              <div className="rounded bg-[var(--surface-muted)] p-3">
                <p className="text-xl font-semibold text-[var(--text-primary)]">{reportCount}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Reports
                </p>
              </div>
              <div className="rounded bg-[var(--surface-muted)] p-3">
                <p className="text-xl font-semibold text-[var(--text-primary)]">
                  {baseVersion?.bindings.length ?? 0}
                </p>
                <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-secondary)]">
                  Bindings
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(["form", "json", "bindings"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPreviewMode(mode)}
                  className={`rounded border px-3 py-2 text-sm font-medium transition ${
                    previewMode === mode
                      ? "border-transparent bg-[var(--text-primary)] text-[var(--text-inverse)]"
                      : "border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            {baseVersion && previewMode === "form" ? (
              <div className="h-[520px] min-h-0">
                <SchemaFormPreview schema={baseVersion.formSchema} />
              </div>
            ) : null}
            {baseVersion && previewMode === "json" ? <SchemaCodeViewer value={schemaCode} /> : null}
            {baseVersion && previewMode === "bindings" ? (
              <div className="space-y-2">
                {baseVersion.bindings.map((binding) => (
                  <div
                    key={binding.id ?? binding.modelId}
                    className="rounded border border-[var(--border-soft)] p-3"
                  >
                    <p className="font-semibold text-[var(--text-primary)]">
                      {binding.modelName ?? binding.modelId}
                    </p>
                    <p className="mt-1 font-mono text-xs text-[var(--text-secondary)]">
                      {binding.pluginPolicy
                        ? JSON.stringify(binding.pluginPolicy)
                        : binding.modelId}
                    </p>
                  </div>
                ))}
                {!baseVersion.bindings.length ? (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No model bindings in this version.
                  </p>
                ) : null}
              </div>
            ) : null}
          </AppPanel>
        </div>
      </AppSurface>
    </AppPage>
  );
}
