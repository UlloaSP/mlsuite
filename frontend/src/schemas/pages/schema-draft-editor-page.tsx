/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AlertTriangle, GitCompareArrows, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { isRecord } from "../../algorithms/mlform/shared";
import {
  useSchema,
  useSchemaDraft,
  useSchemaDraftDiff,
  useSchemaVersion,
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

export function SchemaDraftEditorPage() {
  const { schemaId, draftId } = useParams<{ schemaId: string; draftId: string }>();
  const navigate = useNavigate();
  const { data: schemaDto } = useSchema(schemaId);
  const { data: draft } = useSchemaDraft(draftId);
  const { data: diff } = useSchemaDraftDiff(draftId);
  const { data: baseVersion } = useSchemaVersion(draft?.baseVersionId);
  const updateMutation = useUpdateSchemaDraftMutation(draftId ?? "");
  const [schema, setSchema] = useAtom(schemaAtom);
  const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
  const [schemaErrors] = useAtom(schemaErrorsAtom);
  const [name, setName] = useState("");
  const [editorView, setEditorView] = useState<EditorView>("code");

  const editorHasErrors = Array.isArray(schemaErrors) && schemaErrors.length > 0;
  const conflictCount = diff?.changes.filter((change) => change.conflict).length ?? 0;
  const previewSchema = useMemo(() => schema ?? draft?.formSchema, [draft?.formSchema, schema]);
  const baseText = baseVersion ? JSON.stringify(baseVersion.formSchema, null, 2) : undefined;

  useEffect(() => {
    if (!draft) return;
    setName(draft.name);
    setSchema(draft.formSchema);
    setSchemaText(JSON.stringify(draft.formSchema, null, 2));
  }, [draft, setSchema, setSchemaText]);

  const save = async () => {
    if (!draftId || !draft) return false;
    try {
      const parsed = JSON.parse(schemaText);
      await updateMutation.mutateAsync({
        name: name.trim() || draft.name,
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

  const review = async () => {
    if (!schemaId || !draftId) return;
    const saved = await save();
    if (!saved) return;
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
                onClick={review}
                disabled={!draft || editorHasErrors || updateMutation.isPending}
              >
                <GitCompareArrows size={16} />
                Review changes
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
            <AppButton variant="secondary" onClick={review}>
              <GitCompareArrows size={16} />
              Review
            </AppButton>
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
              <EditorWrapper diffBaseText={baseText} />
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
            </AppPanel>
          </aside>
        </div>
      </AppSurface>
    </AppPage>
  );
}
