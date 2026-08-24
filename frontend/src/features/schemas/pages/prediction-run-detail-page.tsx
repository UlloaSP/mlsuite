/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTabs } from "@/shared/ui/AppTabs";
import {
  usePredictionRun,
  usePredictionRunFeedback,
  useSchema,
  useSchemaBookmark,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { SchemaRunFeedbackQuestionnaire } from "@/features/schemas/components/SchemaRunFeedbackQuestionnaire";
import { SchemaRunInputsPanel } from "@/features/schemas/components/SchemaRunInputsPanel";
import { SchemaRunMetadataRow } from "@/features/schemas/components/SchemaRunMetadataRow";
import { SchemaRunReportsPanel } from "@/features/schemas/components/SchemaRunReportsPanel";
import {
  countCompletedSchemaFeedbackSteps,
  isSchemaFeedbackComplete,
} from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { getVisibleSchemaInputs } from "@/capabilities/prediction-runtime/data/input-display";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import { useSchemaPluginCatalog } from "@/features/schemas/lib/schema-plugin-catalog";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";

type DetailTab = "inputs" | "outputs" | "feedback";

export function PredictionRunDetailPage() {
  const { schemaId, runId, bookmarkId, versionId } = useParams<{
    schemaId: string;
    runId: string;
    bookmarkId: string;
    versionId: string;
  }>();
  const { data: schema } = useSchema(schemaId);
  const { data: run, isLoading } = usePredictionRun(runId);
  const runBookmarkId = run?.schemaBookmarkId ?? bookmarkId;
  const { data: bookmark } = useSchemaBookmark(runBookmarkId);
  const effectiveVersionId = versionId ?? run?.schemaVersionId;
  const historyHref = `/schemas/${schemaId}/bookmarks/${runBookmarkId}/runs`;
  const rerunHref = `/schemas/${schemaId}/bookmarks/${runBookmarkId}/runs/create?fromRunId=${runId}`;
  const { data: version } = useSchemaVersion(effectiveVersionId);
  const executableVersion = useMemo(
    () => (version ? prepareSchemaVersionDtoForUse(version) : undefined),
    [version],
  );
  const runFeedback = usePredictionRunFeedback(run);
  const [tab, setTab] = useState<DetailTab>("inputs");
  const catalog = useSchemaPluginCatalog(executableVersion?.formSchema);
  const feedbackSteps = useMemo(() => {
    if (!run || !executableVersion) return [];
    return buildSchemaFeedbackSteps(executableVersion, run.results, runFeedback.data);
  }, [executableVersion, run, runFeedback.data]);
  const feedbackStatus = isSchemaFeedbackComplete(feedbackSteps) ? "COMPLETED" : "PENDING";
  const inputCount =
    run && executableVersion
      ? getVisibleSchemaInputs(executableVersion.formSchema, run.inputData).length
      : 0;
  const outputCount =
    run && executableVersion
      ? run.results.flatMap((result) => getSchemaResultReports(executableVersion, result)).length
      : 0;
  const detailTabs: Array<{ label: string; value: DetailTab; count: number | string }> = [
    { label: "Inputs", value: "inputs", count: inputCount },
    { label: "Outputs", value: "outputs", count: outputCount },
    {
      label: "Feedback",
      value: "feedback",
      count: `${countCompletedSchemaFeedbackSteps(feedbackSteps)}/${feedbackSteps.length}`,
    },
  ];

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-6 overflow-auto">
        <AppPageHeader
          title={run?.name ?? "Prediction run"}
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            { label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` },
            { label: "Inference History", to: historyHref },
            { label: run?.name ?? "Prediction run" },
          ]}
          actions={
            <Link to={rerunHref}>
              <AppButton>
                <RotateCcw size={16} />
                Predict again
              </AppButton>
            </Link>
          }
        />
        {isLoading ? <AppPanel>Loading run...</AppPanel> : null}
        {run && executableVersion ? (
          <>
            <SchemaRunMetadataRow
              run={run}
              feedbackStatus={feedbackStatus}
              bookmarkName={bookmark?.name ?? String(runBookmarkId ?? "Unknown")}
            />
            <AppTabs items={detailTabs} value={tab} onChange={setTab} />
            <div role="tabpanel" aria-label={`${tab} details`}>
              {tab === "inputs" ? (
                <SchemaRunInputsPanel
                  schema={executableVersion.formSchema}
                  inputData={run.inputData}
                />
              ) : null}
              {tab === "outputs" ? (
                <SchemaRunReportsPanel
                  version={executableVersion}
                  results={run.results}
                  customReportDefinitions={catalog.data.reportDefinitions}
                />
              ) : null}
              {tab === "feedback" ? (
                <SchemaRunFeedbackQuestionnaire
                  key={run.id}
                  run={run}
                  version={executableVersion}
                  feedback={runFeedback.data}
                  onSaved={() => runFeedback.refetch()}
                />
              ) : null}
            </div>
          </>
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
