/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { isRecord } from "@/capabilities/mlform/shared";
import { SchemaRunForm } from "@/features/schemas/components/SchemaRunForm";
import { SchemaRunSaveModal } from "@/features/schemas/components/SchemaRunSaveModal";
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
  const initialInputs = sourceRun?.inputData;

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
        const feedbackByModel = feedback.reduce<Map<string, PendingFeedback[]>>((items, item) => {
          items.set(item.modelId, [...(items.get(item.modelId) ?? []), item]);
          return items;
        }, new Map());
        await createBookmarkRun.mutateAsync({
          ...request,
          results: request.results.map((result) => ({
            ...result,
            feedback: (feedbackByModel.get(result.modelId) ?? []).map(({ type, order, value }) => ({
              type,
              order,
              value,
            })),
          })),
        });
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
              initialInputs={initialInputs}
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
