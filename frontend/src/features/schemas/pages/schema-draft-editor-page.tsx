/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { useAtom } from "jotai";
import { GitCompareArrows, PencilLine, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import {
  useSchema,
  useSchemaDraft,
  useSchemaDraftDiff,
} from "@/features/schemas/api/schema-queries";
import { useUpdateSchemaDraftMutation } from "@/features/schemas/api/schema-draft-mutations";
import { AppActionsMenu } from "@/shared/ui/AppActionsMenu";
import { AppButton } from "@/shared/ui/AppButton";
import { appButtonClass } from "@/shared/ui/button-styles";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSegmentedControl } from "@/shared/ui/AppSegmentedControl";
import { AppSurface } from "@/shared/ui/AppSurface";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "@/features/schemas/lib/editor-atoms";
import { EditorWrapper } from "@/features/schemas/components/EditorWrapper";
import { SchemaChangeNameDialog } from "@/features/schemas/components/SchemaChangeNameDialog";
import { SchemaFormPreview } from "@/features/schemas/components/SchemaFormPreview";
import { SchemaCodeViewer } from "@/features/schemas/components/SchemaCodeViewer";

const EDITOR_VIEWS = ["code", "preview"] as const;
type EditorView = (typeof EDITOR_VIEWS)[number];

export function SchemaDraftEditorPage() {
  const { schemaId, draftId } = useParams<{ schemaId: string; draftId: string }>();
  const navigate = useNavigate();
  const { data: schemaDto } = useSchema(schemaId);
  const { data: draft } = useSchemaDraft(draftId);
  const { data: diff } = useSchemaDraftDiff(draftId);
  const updateMutation = useUpdateSchemaDraftMutation(draftId ?? "");
  const [schema, setSchema] = useAtom(schemaAtom);
  const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
  const [schemaErrors] = useAtom(schemaErrorsAtom);
  const [editorView, setEditorView] = useSearchParamState<EditorView>("view", "code", EDITOR_VIEWS);
  const [renameOpen, setRenameOpen] = useState(false);

  const editorHasErrors = Array.isArray(schemaErrors) && schemaErrors.length > 0;
  const hasBlockingErrors = schemaErrors.some((error) => error.severity !== "warning");
  const conflictCount = diff?.changes.filter((change) => change.conflict).length ?? 0;
  const previewSchema = useMemo(() => schema ?? draft?.formSchema, [draft?.formSchema, schema]);

  useEffect(() => {
    if (!draft) return;
    setSchema(draft.formSchema);
    setSchemaText(JSON.stringify(draft.formSchema, null, 2));
  }, [draft, setSchema, setSchemaText]);

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

  if (draft?.status === "PUBLISHED") {
    return (
      <AppPage>
        <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
          <AppPageHeader
            title={draft.name}
            description="This change has been published and is read-only."
            actions={
              <Link to={`/schemas/${draft.schemaId}/snapshots`} className={appButtonClass()}>
                View snapshots
              </Link>
            }
          />
          <SchemaCodeViewer
            className="min-h-0 flex-1"
            value={JSON.stringify(draft.formSchema, null, 2)}
          />
        </AppSurface>
      </AppPage>
    );
  }

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
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
            { label: "Changes", to: `/schemas/${schemaId}/changes` },
            { label: draft?.name ?? "Change" },
          ]}
          actions={
            <>
              <AppActionsMenu
                label="Open change actions"
                actions={[
                  {
                    key: "rename",
                    label: "Rename",
                    icon: PencilLine,
                    onSelect: () => setRenameOpen(true),
                  },
                ]}
              />
              <AppButton
                onClick={review}
                disabled={!draft || editorHasErrors || updateMutation.isPending}
              >
                <GitCompareArrows size={16} />
                Review changes
              </AppButton>
              <AppButton
                variant="secondary"
                onClick={save}
                disabled={!draft || updateMutation.isPending}
              >
                <Save size={16} />
                Save
              </AppButton>
            </>
          }
        />
        {draft?.status === "CONFLICT" || conflictCount > 0 ? (
          <AppInlineAlert className="flex shrink-0 flex-wrap items-center justify-between gap-3">
            Publishing is blocked until conflicting changes are reviewed and resolved.
            <AppButton size="sm" variant="secondary" onClick={review}>
              <GitCompareArrows size={16} />
              Review
            </AppButton>
          </AppInlineAlert>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <AppSegmentedControl
            label="Editor view"
            options={[
              { value: "code", label: "JSON" },
              { value: "preview", label: "Form preview", disabled: hasBlockingErrors },
            ]}
            value={editorView}
            onChange={setEditorView}
          />
          <div className="flex min-h-0 flex-1 overflow-hidden rounded-card border border-line bg-surface">
            {editorView === "code" ? (
              <EditorWrapper />
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
