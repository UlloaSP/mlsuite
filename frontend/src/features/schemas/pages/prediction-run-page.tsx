/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { RotateCcw } from "lucide-react";
import { type ReactNode, useMemo } from "react";
import { Link, useParams } from "react-router";
import { appButtonClass } from "@/shared/ui/button-styles";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSkeleton } from "@/shared/ui/AppSkeleton";
import { AppSkeletonScope } from "@/shared/ui/AppSkeletonScope";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppTabs } from "@/shared/ui/AppTabs";
import {
  usePredictionRun,
  usePredictionRunFeedback,
  useSchemaBookmark,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { SchemaRunFeedbackQuestionnaire } from "@/features/schemas/components/SchemaRunFeedbackQuestionnaire";
import { SchemaRunInputsPanel } from "@/features/schemas/components/SchemaRunInputsPanel";
import { SchemaRunMetadataRow } from "@/features/schemas/components/SchemaRunMetadataRow";
import { SchemaRunReportsPanel } from "@/features/schemas/components/SchemaRunReportsPanel";
import {
  countCompletedSchemaFeedbackSteps,
  schemaFeedbackStatus,
} from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { getVisibleSchemaInputs } from "@/capabilities/prediction-runtime/data/input-display";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import { useSchemaPluginCatalog } from "@/features/schemas/lib/schema-plugin-catalog";
import { bookmarkInferencesHref } from "@/features/schemas/lib/bookmark-inferences-href";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";
import { questionnaireConfigError } from "@/capabilities/prediction-runtime/feedback/questionnaire-config";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";

const DETAIL_TABS = ["inputs", "outputs", "feedback"] as const;
type DetailTab = (typeof DETAIL_TABS)[number];

/**
 * One saved inference of a bookmark: inputs, outputs, and feedback. It opens
 * inside the bookmark's workspace, so going back returns to the same session.
 */
export function PredictionRunPage() {
  const { bookmarkId = "", runId = "" } = useParams<{ bookmarkId: string; runId: string }>();
  const { data: workspace } = useWorkspaceContext();
  const { data: run, isError } = usePredictionRun(runId);
  const { data: bookmark } = useSchemaBookmark(bookmarkId);
  const { data: version, isError: versionError } = useSchemaVersion(run?.schemaVersionId);
  // The run is read against the snapshot it ran on, not the bookmark's current one.
  const executableVersion = useMemo(
    () => (version ? prepareSchemaVersionDtoForUse(version) : undefined),
    [version],
  );
  const runFeedback = usePredictionRunFeedback(run);
  const [tab, setTab] = useSearchParamState<DetailTab>("tab", "inputs", DETAIL_TABS);
  const catalog = useSchemaPluginCatalog(executableVersion?.formSchema);
  const questionnaireError = questionnaireConfigError(executableVersion?.formSchema);
  const feedbackSteps = useMemo(() => {
    if (!run || !executableVersion || questionnaireError) return [];
    return buildSchemaFeedbackSteps(executableVersion, run.results, runFeedback.data);
  }, [executableVersion, run, runFeedback.data, questionnaireError]);
  const inputCount =
    run && executableVersion
      ? getVisibleSchemaInputs(executableVersion.formSchema, run.inputData).length
      : 0;
  const outputCount =
    run && executableVersion
      ? run.results.flatMap((result) => getSchemaResultReports(executableVersion, result)).length
      : 0;
  const detailTabs: Array<{ label: string; value: DetailTab; count: ReactNode }> = [
    { label: "Inputs", value: "inputs", count: inputCount },
    { label: "Outputs", value: "outputs", count: outputCount },
    {
      label: "Feedback",
      value: "feedback",
      count: runFeedback.isLoading ? (
        <AppSkeleton className="h-4 w-8" />
      ) : (
        `${countCompletedSchemaFeedbackSteps(feedbackSteps)}/${feedbackSteps.length}`
      ),
    },
  ];
  const historyHref = bookmarkInferencesHref(bookmark);

  const body = questionnaireError ? (
    <AppEmptyState title="Invalid feedback questionnaire" description={questionnaireError} />
  ) : isError ? (
    <AppEmptyState
      title="Inference unavailable"
      description="The inference could not be loaded. It may no longer exist or you may not have access."
      action={
        <Link to={historyHref} className={appButtonClass()}>
          Back to inferences
        </Link>
      }
    />
  ) : versionError ? (
    <AppEmptyState
      compact
      title="Schema version unavailable"
      description="The snapshot this inference ran against could not be loaded."
    />
  ) : !run || !executableVersion ? (
    <AppLoadingState label="Loading inference…" rows={3} />
  ) : (
    <>
      <AppSkeletonScope loading={runFeedback.isLoading} label="Loading feedback status…">
        <SchemaRunMetadataRow
          run={run}
          feedbackStatus={schemaFeedbackStatus(feedbackSteps)}
          bookmarkName={bookmark?.name ?? String(run.schemaBookmarkId ?? "Unknown")}
        />
      </AppSkeletonScope>
      <AppTabs items={detailTabs} value={tab} onChange={setTab} />
      <div role="tabpanel" aria-label={`${tab} details`}>
        {tab === "inputs" ? (
          <SchemaRunInputsPanel schema={executableVersion.formSchema} inputData={run.inputData} />
        ) : null}
        {tab === "outputs" ? (
          <SchemaRunReportsPanel
            version={executableVersion}
            results={run.results}
            customReportDefinitions={catalog.data.reportDefinitions}
          />
        ) : null}
        {tab === "feedback" && runFeedback.isLoading ? (
          <AppLoadingState compact label="Loading feedback…" />
        ) : tab === "feedback" ? (
          <SchemaRunFeedbackQuestionnaire
            canEdit={Boolean(workspace?.permissions.canViewOrganization)}
            key={run.id}
            run={run}
            version={executableVersion}
            feedback={runFeedback.data}
            onSaved={() => runFeedback.refetch()}
          />
        ) : null}
      </div>
    </>
  );

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto">
        <AppPageHeader
          title={run?.name ?? "Inference"}
          breadcrumbs={[
            { label: "Predict", to: "/predict" },
            { label: bookmark?.name ?? "Bookmark", to: `/predict/${bookmarkId}` },
            { label: run?.name ?? "Inference" },
          ]}
          actions={
            run && workspace?.permissions.canRunPredictions ? (
              <Link
                to={`/predict/${bookmarkId}?from=${encodeURIComponent(run.id)}`}
                className={appButtonClass()}
              >
                <RotateCcw size={16} />
                Predict again
              </Link>
            ) : null
          }
        />
        {body}
      </AppSurface>
    </AppPage>
  );
}
