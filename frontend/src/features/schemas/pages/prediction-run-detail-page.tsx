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
import {
  usePredictionRun,
  usePredictionRunFeedback,
  useSchema,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { SchemaRunInputsPanel } from "@/features/schemas/components/SchemaRunInputsPanel";
import { SchemaRunFeedbackQuestionnaire } from "@/features/schemas/components/SchemaRunFeedbackQuestionnaire";
import { SchemaRunDetailMetrics } from "@/features/schemas/components/SchemaRunDetailMetrics";
import { SchemaRunReportsPanel } from "@/features/schemas/components/SchemaRunReportsPanel";
import { isSchemaFeedbackComplete } from "@/features/schemas/lib/feedback-state";
import { buildSchemaFeedbackSteps } from "@/capabilities/mlform/feedback-steps";
import { useSchemaPluginCatalog } from "@/features/schemas/lib/schema-plugin-catalog";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/mlform/binding-rebase";

export function PredictionRunDetailPage() {
  const { schemaId, runId, bookmarkId } = useParams<{
    schemaId: string;
    runId: string;
    bookmarkId: string;
  }>();
  const { versionId } = useParams<{ versionId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: run, isLoading } = usePredictionRun(runId);
  const effectiveVersionId = versionId ?? run?.schemaVersionId;
  const historyHref = `/schemas/${schemaId}/bookmarks/${bookmarkId}/runs`;
  const rerunHref = `/schemas/${schemaId}/bookmarks/${bookmarkId}/runs/create?fromRunId=${runId}`;
  const { data: version } = useSchemaVersion(effectiveVersionId);
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
              to: historyHref,
            },
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
              inputData={run.inputData}
              open={inputsOpen}
              onToggle={() => setInputsOpen((current) => !current)}
            />
          </>
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
