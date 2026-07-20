/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { AlertTriangle, GitCompareArrows, MoreHorizontal, PencilLine, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { isRecord } from "@/algorithms/mlform/shared";
import {
  useSchema,
  useSchemaDraft,
  useSchemaDraftDiff,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { useUpdateSchemaDraftMutation } from "@/features/schemas/api/schema-draft-mutations";
import { AppButton } from "@/app/components/AppButton";
import { AppIconButton } from "@/app/components/AppIconButton";
import { AppPage } from "@/app/components/AppPage";
import { AppPageHeader } from "@/app/components/PageHeader";
import { AppPanel } from "@/app/components/AppPanel";
import { AppSurface } from "@/app/components/AppSurface";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "@/editor/atoms";
import { EditorWrapper } from "@/editor/components/EditorWrapper";
import { ToggleButton } from "@/models/components/ToggleButton";
import { SchemaChangeNameDialog } from "@/schemas/components/SchemaChangeNameDialog";
import { SchemaFormPreview } from "@/schemas/components/SchemaFormPreview";

type EditorView = "code" | "preview";

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
  const [editorView, setEditorView] = useState<EditorView>("code");
  const [renameOpen, setRenameOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);

  const editorHasErrors = Array.isArray(schemaErrors) && schemaErrors.length > 0;
  const conflictCount = diff?.changes.filter((change) => change.conflict).length ?? 0;
  const previewSchema = useMemo(() => schema ?? draft?.formSchema, [draft?.formSchema, schema]);
  const baseText = baseVersion ? JSON.stringify(baseVersion.formSchema, null, 2) : undefined;

  useEffect(() => {
    if (!draft) return;
    setSchema(draft.formSchema);
    setSchemaText(JSON.stringify(draft.formSchema, null, 2));
  }, [draft, setSchema, setSchemaText]);

  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setActionsOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, []);

  const save = async () => {
    if (!draftId || !draft) return false;
    try {
      const parsed = JSON.parse(schemaText);
      await updateMutation.mutateAsync({
        expectedDraftRevision: draft.revision,
        name: draft.name,
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

  const rename = async (nextName: string) => {
    if (!draftId || !draft) return;
    try {
      await updateMutation.mutateAsync({
        expectedDraftRevision: draft.revision,
        name: nextName,
        formSchema: draft.formSchema,
        bindings: draft.bindings,
      });
      setRenameOpen(false);
      toast.success("Change renamed");
    } catch (error) {
      toast.error("Change rename failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-5 overflow-hidden">
        <AppPageHeader
          title={draft?.name ?? "Schema change"}
          description={
            schemaDto ? `${schemaDto.name} · base v${draft?.baseVersion ?? "-"}` : undefined
          }
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId
              ? [{ label: schemaDto?.name ?? "Schema", to: `/schemas/${schemaId}` }]
              : []),
            { label: draft?.name ?? "Change" },
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
              <div ref={actionsRef} className="relative">
                <AppIconButton
                  type="button"
                  aria-label="Open change actions"
                  onClick={() => setActionsOpen((current) => !current)}
                >
                  <MoreHorizontal size={18} />
                </AppIconButton>
                {actionsOpen ? (
                  <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 min-w-[170px] rounded border border-[var(--border-soft)] bg-[var(--surface-primary)] p-2 shadow-[var(--shadow-hover)]">
                    <button
                      type="button"
                      className={menuItemClass}
                      onClick={() => {
                        setActionsOpen(false);
                        setRenameOpen(true);
                      }}
                    >
                      <PencilLine size={15} />
                      Rename
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          }
        />
        {draft?.status === "CONFLICT" || conflictCount > 0 ? (
          <AppPanel className="flex items-center justify-between gap-3 p-4">
            <div className="flex items-center gap-3 text-sm text-[var(--danger-text)]">
              <AlertTriangle size={18} />
              Publishing is blocked until conflicting changes are reviewed and resolved.
            </div>
            <AppButton variant="secondary" onClick={review}>
              <GitCompareArrows size={16} />
              Review
            </AppButton>
          </AppPanel>
        ) : null}
        <div className="min-h-0 flex-1">
          <div className="relative flex size-full min-h-0 overflow-hidden rounded border border-[var(--border-soft)] bg-[var(--surface-primary)]">
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
        </div>
      </AppSurface>
      <SchemaChangeNameDialog
        defaultName={draft?.name ?? ""}
        description={schemaDto ? `${schemaDto.name} · base v${draft?.baseVersion ?? "-"}` : ""}
        open={renameOpen}
        pending={updateMutation.isPending}
        submitLabel="Rename"
        title="Rename change"
        onClose={() => setRenameOpen(false)}
        onConfirm={(name) => void rename(name)}
      />
    </AppPage>
  );
}

const menuItemClass =
  "flex w-full items-center gap-3 rounded px-3 py-2.5 text-left text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--surface-muted)]";
