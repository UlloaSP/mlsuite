/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AppPage, AppPageHeader, AppPanel, AppSurface } from "../../app/components";
import { invalidatePluginCatalog } from "../../algorithms/plugin/catalog-loader";
import { isRecord } from "../../algorithms/mlform/shared";
import { SchemaRunForm } from "../components/SchemaRunForm";
import { SchemaRunSaveModal } from "../components/SchemaRunSaveModal";
import { createPredictionResultFeedback } from "../../api/schemas/services";
import {
  useCreatePredictionRunMutation,
  usePredictionRun,
  useSchema,
  useSchemaVersion,
} from "../../api/schemas/hooks";
import { prepareSchemaVersionDtoForUse } from "../../algorithms/schema/binding-rebase";
import type { PendingFeedback } from "../../algorithms/schema/pending-feedback";
import type { CreatePredictionRunRequest, JsonRecord } from "../../api/schemas/dtos";

export function CreateSchemaRunPage() {
  const [searchParams] = useSearchParams();
  const { schemaId, versionId } = useParams<{ schemaId: string; versionId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: version, isLoading } = useSchemaVersion(versionId);
  const executableVersion = useMemo(
    () => (version ? prepareSchemaVersionDtoForUse(version) : undefined),
    [version],
  );
  const fromRunId = searchParams.get("fromRunId") ?? undefined;
  const { data: sourceRun } = usePredictionRun(fromRunId);
  const createRun = useCreatePredictionRunMutation(versionId ?? "");
  const [pendingRun, setPendingRun] = useState<{
    inputData: JsonRecord;
    raw: JsonRecord;
    reportsPending: boolean;
  } | null>(null);
  const [defaultName] = useState(`run-${new Date().toISOString()}`);
  const initialInputsRef = useRef<JsonRecord | undefined>(undefined);
  if (!initialInputsRef.current && sourceRun) {
    initialInputsRef.current = sourceRun.inputData;
  }

  useEffect(() => {
    invalidatePluginCatalog();
  }, []);

  const handleSubmit = useCallback(
    (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => {
      setPendingRun({ inputData, raw, reportsPending });
    },
    [],
  );

  const handleResultUpdate = useCallback(
    (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => {
      setPendingRun((current) => (current ? { inputData, raw, reportsPending } : current));
    },
    [],
  );

  const handleSave = useCallback(
    async (request: CreatePredictionRunRequest, feedback: PendingFeedback[]) => {
      try {
        const run = await createRun.mutateAsync(request);
        await Promise.all(
          feedback.map((item) => {
            const result = run.results.find((candidate) => candidate.modelId === item.modelId);
            if (!result) return Promise.resolve();
            return createPredictionResultFeedback({
              resultId: result.id,
              type: item.type,
              order: item.order,
              value: item.value,
            });
          }),
        );
        setPendingRun(null);
        toast.success("Run saved");
      } catch (error) {
        toast.error("Run persistence failed", {
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [createRun],
  );

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <div className="shrink-0">
          <AppPageHeader
            title="New schema run"
            breadcrumbs={[
              { label: "Schemas", to: "/schemas" },
              { label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` },
              ...(executableVersion
                ? [
                    {
                      label: `${executableVersion.name} v${executableVersion.version}`,
                      to: `/schemas/${schemaId}/versions/${versionId}/runs`,
                    },
                  ]
                : []),
              { label: "New Run" },
            ]}
          />
        </div>
        {isLoading ? <AppPanel>Loading schema version...</AppPanel> : null}
        {executableVersion && isRecord(executableVersion.formSchema) ? (
          <div className="min-h-0 flex-1 overflow-hidden">
            <SchemaRunForm
              version={executableVersion}
              initialInputs={initialInputsRef.current}
              onSubmit={handleSubmit}
              onResultUpdate={handleResultUpdate}
            />
          </div>
        ) : null}
        {executableVersion ? (
          <SchemaRunSaveModal
            open={pendingRun !== null}
            pendingRun={pendingRun}
            defaultName={defaultName}
            version={executableVersion}
            isSaving={createRun.isPending}
            onCancel={() => setPendingRun(null)}
            onSave={handleSave}
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
