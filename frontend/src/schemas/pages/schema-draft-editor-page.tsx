/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AlertTriangle, GitCompareArrows, RefreshCcw, Save, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { isRecord } from "../../algorithms/mlform/shared";
import {
  usePublishSchemaDraftMutation,
  useSchema,
  useSchemaDraft,
  useSchemaDraftDiff,
  useUpdateSchemaDraftMutation,
} from "../../api/schemas/hooks";
import {
  AppBadge,
  AppButton,
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSurface,
  AppTextField,
} from "../../app/components";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "../../editor/atoms";
import { EditorWrapper } from "../../editor/components/EditorWrapper";
import { ToggleButton } from "../../models/components/ToggleButton";
import { SchemaFormPreview } from "../components/SchemaFormPreview";

type EditorView = "code" | "preview";

const statusTone = (status?: string): "danger" | "success" | "warning" => {
  if (status === "CONFLICT") return "danger";
  if (status === "PUBLISHED") return "success";
  return "warning";
};

const displayValue = (value: unknown) =>
  value === undefined ? "missing" : typeof value === "string" ? value : JSON.stringify(value);

export function SchemaDraftEditorPage() {
  const { schemaId, draftId } = useParams<{ schemaId: string; draftId: string }>();
  const navigate = useNavigate();
  const { data: schemaDto } = useSchema(schemaId);
  const { data: draft } = useSchemaDraft(draftId);
  const { data: diff } = useSchemaDraftDiff(draftId);
  const updateMutation = useUpdateSchemaDraftMutation(draftId ?? "");
  const publishMutation = usePublishSchemaDraftMutation(draftId ?? "", schemaId ?? "");
  const [schema, setSchema] = useAtom(schemaAtom);
  const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
  const [schemaErrors] = useAtom(schemaErrorsAtom);
  const [name, setName] = useState("");
  const [bookmark, setBookmark] = useState("");
  const [editorView, setEditorView] = useState<EditorView>("code");

  const editorHasErrors = Array.isArray(schemaErrors) && schemaErrors.length > 0;
  const conflictCount = diff?.changes.filter((change) => change.conflict).length ?? 0;
  const previewSchema = useMemo(() => schema ?? draft?.formSchema, [draft?.formSchema, schema]);

  useEffect(() => {
    if (!draft) return;
    setName(draft.name);
    setBookmark(draft.bookmark ?? "");
    setSchema(draft.formSchema);
    setSchemaText(JSON.stringify(draft.formSchema, null, 2));
  }, [draft, setSchema, setSchemaText]);

  const save = async () => {
    if (!draftId || !draft) return false;
    try {
      const parsed = JSON.parse(schemaText);
      await updateMutation.mutateAsync({
        name: name.trim() || draft.name,
        bookmark: bookmark.trim() || undefined,
        formSchema: isRecord(parsed) ? parsed : draft.formSchema,
        bindings: draft.bindings,
      });
      toast.success("Schema change saved");
      return true;
    } catch (error) {
      toast.error("Schema change save failed", {
        description: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  };

  const publish = async () => {
    if (!schemaId || !draftId) return;
    const saved = await save();
    if (!saved) return;
    const result = await publishMutation.mutateAsync();
    if (result.status === "published") {
      void navigate(`/schemas/${schemaId}`);
      return;
    }
    void navigate(`/schemas/${schemaId}/drafts/${draftId}/conflicts`);
  };

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
        <AppPageHeader
          title={name || "Schema change"}
          description={
            schemaDto ? `${schemaDto.name} · base v${draft?.baseVersion ?? "-"}` : undefined
          }
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId
              ? [{ label: schemaDto?.name ?? "Schema", to: `/schemas/${schemaId}` }]
              : []),
            { label: "Change" },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              <AppButton
                variant="secondary"
                onClick={save}
                disabled={!draft || updateMutation.isPending}
              >
                <Save size={16} />
                Save
              </AppButton>
              <AppButton
                onClick={publish}
                disabled={!draft || editorHasErrors || publishMutation.isPending}
              >
                {publishMutation.isPending ? (
                  <RefreshCcw className="animate-spin" size={16} />
                ) : (
                  <Tag size={16} />
                )}
                Publish
              </AppButton>
            </div>
          }
        />
        {draft?.status === "CONFLICT" || conflictCount > 0 ? (
          <AppPanel className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 text-sm text-[var(--danger-text)]">
              <AlertTriangle size={18} />
              Publishing is blocked until this change is recreated from the current version.
            </div>
            {schemaId && draftId ? (
              <Link to={`/schemas/${schemaId}/drafts/${draftId}/conflicts`}>
                <AppButton variant="secondary">
                  <GitCompareArrows size={16} />
                  Review
                </AppButton>
              </Link>
            ) : null}
          </AppPanel>
        ) : null}
        <div className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="flex relative min-h-0 overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)]">
            <div className="absolute right-4 top-4 z-20">
              <ToggleButton
                isProcessing={false}
                isJsonActive={editorView === "code"}
                onToggleMode={() => setEditorView((view) => (view === "code" ? "preview" : "code"))}
              />
            </div>
            {editorView === "code" ? (
              <EditorWrapper />
            ) : editorHasErrors ? (
              <AppPanel className="m-4">Fix schema errors to preview the form.</AppPanel>
            ) : (
              <SchemaFormPreview schema={previewSchema} />
            )}
          </div>
          <aside className="min-h-0 space-y-4 overflow-auto">
            <AppPanel className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-[var(--text-primary)]">Change</h2>
                <AppBadge tone={statusTone(draft?.status)}>{draft?.status ?? "DRAFT"}</AppBadge>
              </div>
              <AppTextField value={name} onChange={(event) => setName(event.target.value)} />
              <AppTextField
                value={bookmark}
                placeholder="bookmark"
                onChange={(event) => setBookmark(event.target.value)}
              />
            </AppPanel>
            <AppPanel className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold text-[var(--text-primary)]">Semantic delta</h2>
                <AppBadge tone={conflictCount ? "danger" : "neutral"}>
                  {conflictCount
                    ? `${conflictCount} conflicts`
                    : `${diff?.changes.length ?? 0} changes`}
                </AppBadge>
              </div>
              <div className="space-y-2">
                {(diff?.changes ?? []).slice(0, 6).map((change) => (
                  <div
                    key={change.path}
                    className="rounded border border-[var(--border-soft)] p-3 text-sm"
                  >
                    <div className="font-mono text-xs text-[var(--text-secondary)]">
                      {change.path}
                    </div>
                    <div className="mt-1 truncate text-[var(--text-primary)]">
                      {displayValue(change.draftValue)}
                    </div>
                  </div>
                ))}
                {!diff?.changes.length ? (
                  <p className="text-sm text-[var(--text-secondary)]">
                    No saved schema changes yet.
                  </p>
                ) : null}
              </div>
            </AppPanel>
          </aside>
        </div>
      </AppSurface>
    </AppPage>
  );
}
