/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { useAtom } from "jotai";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AppPage, AppPageHeader, AppPanel, AppSurface } from "../../app/components/ui";
import { AppButton, AppTextField } from "../../app/components/ui-controls";
import { isRecord } from "../../app/utils/mlform/shared";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "../../editor/atoms";
import { EditorWrapper } from "../../editor/components/EditorWrapper";
import { useGetModels } from "../../models/hooks";
import { createSchemaVersion } from "../api/schemaService";
import { SchemaModelSelector } from "../components/SchemaModelSelector";
import { useCreateSchemaMutation, useSchemaVersions } from "../hooks";
import { countVisibleSchemaFields } from "../one-hot-schema";
import { prepareSchemaVersionForSave } from "../schema-binding-rebase";
import { composeSchemaVersion, type SelectedSchemaSignature } from "../schema-composer";
import type { CreateSchemaVersionRequest } from "../types";

type SelectedModel = SelectedSchemaSignature & {
  signatureId: string;
};

type Step = "models" | "editor";

export function CreateSchemaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetSchemaId = searchParams.get("schemaId") ?? "";
  const { data: models = [], isLoading } = useGetModels();
  const createSchema = useCreateSchemaMutation();
  const [schema, setSchema] = useAtom(schemaAtom);
  const [, setSchemaText] = useAtom(schemaTextAtom);
  const [schemaErrors] = useAtom(schemaErrorsAtom);
  const mode = targetSchemaId ? "version" : "schema";
  const [step, setStep] = useState<Step>(searchParams.get("schemaId") ? "editor" : "models");
  const [name, setName] = useState("");
  const { data: existingVersions = [] } = useSchemaVersions(targetSchemaId);
  const [selected, setSelected] = useState<SelectedModel[]>([]);
  const [saving, setSaving] = useState(false);

  const composedVersion = useMemo(
    () => composeSchemaVersion("v1", selected.map(({ modelId, signature }) => ({ modelId, signature }))),
    [selected],
  );
  const latestVersion = existingVersions[0];
  const lockedVersion = useMemo<CreateSchemaVersionRequest | null>(() => {
    if (!latestVersion) return null;
    return {
      name: "new version",
      formSchema: latestVersion.formSchema,
      bindings: latestVersion.bindings.map((binding) => ({
        modelId: binding.modelId,
        signatureId: binding.signatureId,
        inputMapping: binding.inputMapping,
        outputMapping: binding.outputMapping,
        pluginPolicy: binding.pluginPolicy ?? undefined,
      })),
    };
  }, [latestVersion]);
  const activeVersionRequest = mode === "version" ? lockedVersion : composedVersion;
  const hasEditor =
    mode === "version" ? Boolean(lockedVersion) : step === "editor" && selected.length > 0;
  const canContinue = mode === "schema" && name.trim().length > 0 && selected.length > 0;
  const canSubmit =
    hasEditor &&
    Boolean(activeVersionRequest) &&
    (mode === "schema" ? name.trim().length > 0 : targetSchemaId.trim().length > 0);
  const busy = createSchema.isPending || saving;
  const editorHasErrors = Array.isArray(schemaErrors) && schemaErrors.length > 0;
  const fieldCount = countVisibleSchemaFields(activeVersionRequest?.formSchema);
  const reportCount = Array.isArray(activeVersionRequest?.formSchema.reports)
    ? activeVersionRequest.formSchema.reports.length
    : 0;
  const activeModelCount = mode === "version" ? activeVersionRequest?.bindings.length ?? 0 : selected.length;

  useEffect(() => {
    if (!hasEditor || !activeVersionRequest) {
      setSchema(null);
      setSchemaText("");
      return;
    }
    setSchema(activeVersionRequest.formSchema);
    setSchemaText(JSON.stringify(activeVersionRequest.formSchema, null, 2));
  }, [activeVersionRequest, hasEditor, setSchema, setSchemaText]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "schema" && step === "models") {
      if (canContinue) setStep("editor");
      return;
    }
    if (!canSubmit || busy) return;
    setSaving(true);
    try {
      if (!activeVersionRequest) return;
      const editedSchema = isRecord(schema) ? schema : activeVersionRequest.formSchema;
      const preparedVersion = prepareSchemaVersionForSave(activeVersionRequest, editedSchema);
      const schemaId =
        mode === "schema" ? (await createSchema.mutateAsync({ name })).id : targetSchemaId;
      await createSchemaVersion(schemaId, {
        ...preparedVersion,
        name: mode === "schema" ? "v1" : "new version",
      });
      navigate(`/schemas/${schemaId}`);
    } catch (error) {
      toast.error("Schema create failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title={mode === "schema" ? "New schema" : "New schema version"}
          description="Select model signatures, then edit the generated form snapshot."
          backHref="/schemas"
        />
        <form className="flex min-h-0 flex-1 flex-col gap-6" onSubmit={submit}>
          <AppPanel className="shrink-0 space-y-4">
            <div className="grid gap-4 xl:grid-cols-[minmax(260px,1fr)_auto_auto] xl:items-end">
              {mode === "schema" ? (
                <AppTextField
                  value={name}
                  placeholder="Schema name"
                  required
                  onChange={(event) => setName(event.target.value)}
                  className="w-full"
                />
              ) : (
                <div>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">Locked model bindings</p>
                  <p className="text-sm text-[var(--text-secondary)]">
                    New version keeps {activeModelCount} model/signature pairs from v
                    {latestVersion?.version ?? "-"}.
                  </p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="min-w-20 rounded-[18px] bg-[var(--surface-muted)] p-3">
                  <p className="text-2xl font-semibold">{activeModelCount}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Models</p>
                </div>
                <div className="min-w-20 rounded-[18px] bg-[var(--surface-muted)] p-3">
                  <p className="text-2xl font-semibold">{fieldCount}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Fields</p>
                </div>
                <div className="min-w-20 rounded-[18px] bg-[var(--surface-muted)] p-3">
                  <p className="text-2xl font-semibold">{reportCount}</p>
                  <p className="text-xs text-[var(--text-secondary)]">Reports</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 xl:justify-end">
                {mode === "schema" && step === "editor" ? (
                  <AppButton type="button" variant="secondary" onClick={() => setStep("models")}>
                    <ArrowLeft size={16} />
                    Back
                  </AppButton>
                ) : null}
                <AppButton
                  type="submit"
                  disabled={
                    mode === "schema" && step === "models"
                      ? !canContinue || isLoading
                      : !canSubmit || busy || isLoading || editorHasErrors
                  }
                  className="min-w-[220px]"
                >
                  {mode === "schema" && step === "models" ? (
                    <>
                      <ArrowRight size={16} />
                      Continue to editor
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      {mode === "schema" ? "Create schema" : "Create version"}
                    </>
                  )}
                </AppButton>
              </div>
            </div>
          </AppPanel>
          {mode === "schema" && step === "models" ? (
            <div className="min-h-0 flex-1 overflow-hidden">
              <SchemaModelSelector models={models} value={selected} onChange={setSelected} />
            </div>
          ) : null}
          {hasEditor ? (
            <div className="flex min-h-0 flex-1 overflow-hidden rounded-[24px] border border-[var(--border-soft)]">
              <EditorWrapper />
            </div>
          ) : null}
        </form>
      </AppSurface>
    </AppPage>
  );
}
