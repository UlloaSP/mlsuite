/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { type ReactNode, useMemo } from "react";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppSkeletonScope } from "@/shared/ui/AppSkeletonScope";
import { AppTabs } from "@/shared/ui/AppTabs";
import {
  usePredictionRun,
  usePredictionRunFeedback,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { SchemaRunInputsPanel } from "@/features/schemas/components/SchemaRunInputsPanel";
import { SchemaRunMetadataRow } from "@/features/schemas/components/SchemaRunMetadataRow";
import { SchemaRunReportsPanel } from "@/features/schemas/components/SchemaRunReportsPanel";
import { schemaFeedbackStatus } from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { getVisibleSchemaInputs } from "@/capabilities/prediction-runtime/data/input-display";
import { getSchemaResultReports } from "@/capabilities/prediction-runtime/data/report-display";
import { useSchemaPluginCatalog } from "@/features/schemas/lib/schema-plugin-catalog";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";
import { questionnaireConfigError } from "@/capabilities/prediction-runtime/feedback/questionnaire-config";

const DETAIL_TABS = ["inputs", "outputs", "reviews"] as const;

/** A tab's own scroll area inside the fixed-height page. */
function ScrollPanel({ children }: { children: ReactNode }) {
  return (
    <div
      data-scroll-memory="inference-data"
      className="app-scroll min-h-0 flex-1 overflow-y-auto pr-1"
    >
      {children}
    </div>
  );
}
type DetailTab = (typeof DETAIL_TABS)[number];

type Props = {
  runId: string;
  bookmarkName?: string | null;
  /** The Reviews tab's content (the inference page's review management); no tab without it. */
  reviews?: { content: ReactNode; count?: ReactNode } | null;
};

/**
 * A saved inference's data: inputs and outputs, and (for review managers) the
 * reviews it is part of. Feedback is never given here: answering belongs to reviews.
 */
export function PredictionRunDetails({ runId, bookmarkName, reviews }: Props) {
  const { data: run, isError } = usePredictionRun(runId);
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

  if (questionnaireError)
    return (
      <AppEmptyState title="Invalid feedback questionnaire" description={questionnaireError} />
    );
  if (isError)
    return (
      <AppEmptyState
        compact
        title="Inference data unavailable"
        description="Its inputs and outputs could not be loaded."
      />
    );
  if (versionError)
    return (
      <AppEmptyState
        compact
        title="Schema version unavailable"
        description="The snapshot this inference ran against could not be loaded."
      />
    );
  if (!run || !executableVersion) return <AppLoadingState label="Loading inference…" rows={3} />;

  const detailTabs: Array<{ label: string; value: DetailTab; count: ReactNode }> = [
    {
      label: "Inputs",
      value: "inputs",
      count: getVisibleSchemaInputs(executableVersion.formSchema, run.inputData).length,
    },
    {
      label: "Outputs",
      value: "outputs",
      count: run.results.flatMap((result) => getSchemaResultReports(executableVersion, result))
        .length,
    },
    ...(reviews ? [{ label: "Reviews", value: "reviews" as const, count: reviews.count }] : []),
  ];

  return (
    <>
      <AppSkeletonScope loading={runFeedback.isLoading} label="Loading feedback status…">
        <SchemaRunMetadataRow
          run={run}
          feedbackStatus={schemaFeedbackStatus(feedbackSteps)}
          bookmarkName={bookmarkName ?? "None"}
        />
      </AppSkeletonScope>
      <AppTabs items={detailTabs} value={tab} onChange={setTab} />
      <div role="tabpanel" aria-label={`${tab} details`} className="flex min-h-0 flex-1 flex-col">
        {tab === "inputs" ? (
          <ScrollPanel>
            <SchemaRunInputsPanel schema={executableVersion.formSchema} inputData={run.inputData} />
          </ScrollPanel>
        ) : null}
        {tab === "outputs" ? (
          <ScrollPanel>
            <SchemaRunReportsPanel
              version={executableVersion}
              results={run.results}
              customReportDefinitions={catalog.data.reportDefinitions}
            />
          </ScrollPanel>
        ) : null}
        {tab === "reviews" ? reviews?.content : null}
      </div>
    </>
  );
}
