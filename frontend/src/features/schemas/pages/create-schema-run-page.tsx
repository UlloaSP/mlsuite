/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Check, LoaderCircle, PencilLine, Save } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppButton } from "@/shared/ui/AppButton";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { SchemaRunForm } from "@/features/schemas/components/SchemaRunForm";
import { useCreatePredictionRunForBookmarkMutation } from "@/features/schemas/api/schema-prediction-mutations";
import {
  usePredictionRun,
  useSchema,
  useSchemaBookmark,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";
import { mergeSchemaRunInputs } from "@/capabilities/prediction-runtime/data/input-display";
import {
  getSchemaRunSaveAction,
  type SchemaRunCreationPhase,
} from "@/features/schemas/lib/schema-run-save-action";
import type { CreatePredictionRunRequest } from "@/features/schemas/api/prediction-types";
import type { JsonRecord } from "@/features/schemas/api/schema-types";

const createRunName = () => `run-${new Date().toISOString()}`;

const toResults = (raw: JsonRecord): CreatePredictionRunRequest["results"] =>
  Array.isArray(raw.results) ? (raw.results as CreatePredictionRunRequest["results"]) : [];

export function CreateSchemaRunPage() {
  const [searchParams] = useSearchParams();
  const { schemaId, bookmarkId } = useParams<{
    schemaId: string;
    bookmarkId: string;
  }>();
  const { data: schema } = useSchema(schemaId);
  const { data: bookmark } = useSchemaBookmark(bookmarkId);
  const effectiveVersionId = bookmark?.versionId;
  const { data: version, isLoading } = useSchemaVersion(effectiveVersionId);
  const executableVersion = useMemo(
    () => (version ? prepareSchemaVersionDtoForUse(version) : undefined),
    [version],
  );
  const fromRunId = searchParams.get("fromRunId") ?? undefined;
  const { data: sourceRun } = usePredictionRun(fromRunId);
  const createBookmarkRun = useCreatePredictionRunForBookmarkMutation(bookmarkId ?? "");
  const [pendingRun, setPendingRun] = useState<{
    inputData: JsonRecord;
    raw: JsonRecord;
    reportsPending: boolean;
  } | null>(null);
  const [name, setName] = useState(createRunName);
  const nameEditedRef = useRef(false);
  const [phase, setPhase] = useState<SchemaRunCreationPhase>("idle");
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const runGenerationRef = useRef(0);
  const initialInputs = sourceRun?.inputData;

  const handleSubmit = useCallback(
    (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => {
      setPendingRun({ inputData, raw, reportsPending });
      setPhase("unsaved");
    },
    [],
  );

  const handleResultUpdate = useCallback(
    (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => {
      setPendingRun((current) => (current ? { inputData, raw, reportsPending } : current));
    },
    [],
  );

  const handleRunningChange = useCallback((running: boolean) => {
    if (running) {
      runGenerationRef.current += 1;
      if (!nameEditedRef.current) setName(createRunName());
      setPendingRun(null);
      setPhase("running");
      return;
    }
    setPhase((current) => (current === "running" ? "idle" : current));
  }, []);

  const handleSave = useCallback(async () => {
    if (isSavingRef.current || !pendingRun || pendingRun.reportsPending || !name.trim()) return;
    isSavingRef.current = true;
    setIsSaving(true);
    const savedGeneration = runGenerationRef.current;
    const results = toResults(pendingRun.raw);
    try {
      await createBookmarkRun.mutateAsync({
        name: name.trim(),
        inputData: mergeSchemaRunInputs(pendingRun.inputData, results),
        results,
      });
      if (runGenerationRef.current === savedGeneration) {
        setPendingRun(null);
        setPhase("saved");
      }
      toast.success("Inference saved");
    } catch (error) {
      toast.error("Inference persistence failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [createBookmarkRun, name, pendingRun]);

  const saveAction = getSchemaRunSaveAction(
    phase,
    pendingRun?.reportsPending ?? false,
    isSaving,
    name.trim().length > 0,
  );

  const saveIcon = saveAction.loading ? (
    <LoaderCircle className="animate-spin" size={18} />
  ) : phase === "saved" ? (
    <Check size={18} />
  ) : (
    <Save size={18} />
  );

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <div className="shrink-0">
          <AppPageHeader
            title={
              <span className="inline-flex max-w-full items-center gap-2">
                <input
                  aria-label="Inference name"
                  disabled={isSaving || phase === "saved"}
                  size={Math.max(name.length, 1)}
                  spellCheck={false}
                  value={name}
                  onChange={(event) => {
                    nameEditedRef.current = true;
                    setName(event.target.value);
                  }}
                  className="min-w-0 max-w-full bg-transparent font-inherit text-inherit outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-default"
                />
                <PencilLine
                  aria-hidden="true"
                  className="shrink-0 text-[var(--text-muted)]"
                  size={17}
                />
              </span>
            }
            breadcrumbs={[
              { label: "Schemas", to: "/schemas" },
              { label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` },
              ...(executableVersion
                ? [
                    {
                      label: `${executableVersion.name} v${executableVersion.version}`,
                      to: `/schemas/${schemaId}/bookmarks/${bookmarkId}/runs`,
                    },
                  ]
                : []),
              { label: "New inference" },
            ]}
            actions={
              <AppButton
                data-schema-run-save=""
                disabled={saveAction.disabled}
                onClick={() => void handleSave()}
              >
                {saveIcon}
                <span aria-live="polite">{saveAction.label}</span>
              </AppButton>
            }
          />
        </div>
        {isLoading ? <AppPanel>Loading schema version...</AppPanel> : null}
        {executableVersion && isRecord(executableVersion.formSchema) ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <SchemaRunForm
              version={executableVersion}
              initialInputs={initialInputs}
              onSubmit={handleSubmit}
              onResultUpdate={handleResultUpdate}
              onRunningChange={handleRunningChange}
            />
          </div>
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
