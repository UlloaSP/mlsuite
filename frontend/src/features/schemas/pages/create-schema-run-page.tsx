/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { invalidatePluginCatalog } from "@/capabilities/mlform/plugin-catalog-loader";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { isRecord } from "@/capabilities/mlform/shared";
import { SchemaRunForm } from "@/features/schemas/components/SchemaRunForm";
import { SchemaRunSaveModal } from "@/features/schemas/components/SchemaRunSaveModal";
import { createPredictionResultFeedback } from "@/features/schemas/api/schema-prediction-api";
import { useCreatePredictionRunForBookmarkMutation } from "@/features/schemas/api/schema-prediction-mutations";
import {
  usePredictionRun,
  useSchema,
  useSchemaBookmark,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/mlform/binding-rebase";
import type { PendingFeedback } from "@/features/schemas/lib/pending-feedback";
import type { CreatePredictionRunRequest } from "@/features/schemas/api/prediction-types";
import type { JsonRecord } from "@/features/schemas/api/schema-types";

export function CreateSchemaRunPage() {
  const organizationId = useCurrentOrganizationId() ?? "none";
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
  const [defaultName] = useState(`run-${new Date().toISOString()}`);
  const initialInputsRef = useRef<JsonRecord | undefined>(undefined);
  if (!initialInputsRef.current && sourceRun) {
    initialInputsRef.current = sourceRun.inputData;
  }

  useEffect(() => {
    invalidatePluginCatalog(organizationId);
  }, [organizationId]);

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
        const run = await createBookmarkRun.mutateAsync(request);
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
    [createBookmarkRun],
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
                      to: `/schemas/${schemaId}/bookmarks/${bookmarkId}/runs`,
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
            isSaving={createBookmarkRun.isPending}
            onCancel={() => setPendingRun(null)}
            onSave={handleSave}
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
