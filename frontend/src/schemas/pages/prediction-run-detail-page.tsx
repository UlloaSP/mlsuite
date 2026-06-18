/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { AppButton, AppPage, AppPageHeader, AppPanel, AppSurface } from "../../app/components";
import { usePredictionRun, usePredictionRunFeedback, useSchema, useSchemaVersion } from "../../api/schemas/hooks";
import { SchemaRunInputsPanel } from "../components/SchemaRunInputsPanel";
import { SchemaRunFeedbackQuestionnaire } from "../components/SchemaRunFeedbackQuestionnaire";
import { SchemaRunDetailMetrics } from "../components/SchemaRunDetailMetrics";
import { SchemaRunReportsPanel } from "../components/SchemaRunReportsPanel";
import { mergeSchemaRunInputs } from "../../algorithms/schema/input-display";
import { isSchemaFeedbackComplete } from "../../algorithms/schema/feedback-state";
import { buildSchemaFeedbackSteps } from "../../algorithms/schema/feedback-steps";
import { useSchemaPluginCatalog } from "../useSchemaPluginCatalog";
import { prepareSchemaVersionDtoForUse } from "../../algorithms/schema/binding-rebase";

export function PredictionRunDetailPage() {
  const { schemaId, runId } = useParams<{ schemaId: string; runId: string }>();
  const { versionId } = useParams<{ versionId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: run, isLoading } = usePredictionRun(runId);
  const { data: version } = useSchemaVersion(versionId);
  const executableVersion = useMemo(
    () => (version ? prepareSchemaVersionDtoForUse(version) : undefined),
    [version],
  );
  const runFeedback = usePredictionRunFeedback(run);
  const [reportsOpen, setReportsOpen] = useState(true);
  const [inputsOpen, setInputsOpen] = useState(true);
  const catalog = useSchemaPluginCatalog(executableVersion?.formSchema);
  const feedbackStatus = useMemo(() => {
    if (!run || !executableVersion) return "PENDING" as const;
    const steps = buildSchemaFeedbackSteps(executableVersion, run.results, runFeedback.data);
    return isSchemaFeedbackComplete(steps) ? "COMPLETED" : "PENDING";
  }, [executableVersion, run, runFeedback.data]);

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-6 overflow-auto">
        <AppPageHeader
          title={run?.name ?? "Prediction run"}
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            { label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` },
            {
              label: "Inference History",
              to: `/schemas/${schemaId}/versions/${versionId}/runs`,
            },
            { label: run?.name ?? "Prediction run" },
          ]}
          actions={
            <Link to={`/schemas/${schemaId}/versions/${versionId}/runs/create?fromRunId=${runId}`}>
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
            <SchemaRunDetailMetrics run={run} feedbackStatus={feedbackStatus} />
            <SchemaRunFeedbackQuestionnaire
              run={run}
              version={executableVersion}
              feedback={runFeedback.data}
              onSaved={() => runFeedback.refetch()}
            />
            <SchemaRunReportsPanel
              version={executableVersion}
              results={run.results}
              open={reportsOpen}
              onToggle={() => setReportsOpen((current) => !current)}
              customReportDefinitions={catalog.data.reportDefinitions}
            />
            <SchemaRunInputsPanel
              schema={executableVersion.formSchema}
              inputData={mergeSchemaRunInputs(run.inputData, run.results)}
              open={inputsOpen}
              onToggle={() => setInputsOpen((current) => !current)}
            />
          </>
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
