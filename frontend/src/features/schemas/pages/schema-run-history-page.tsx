/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Play } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSurface } from "@/shared/ui/AppSurface";
import { SchemaRunHistoryTable } from "@/features/schemas/components/SchemaRunHistoryTable";
import { SchemaRunReviewButton } from "@/features/schemas/components/SchemaRunReviewButton";
import {
  SchemaRunHistoryToolbar,
  type SchemaRunDateRangeFilter,
  type SchemaRunFeedbackStatusFilter,
  type SchemaRunStatusFilter,
} from "@/features/schemas/components/SchemaRunHistoryToolbar";
import { SchemaRunBulkUploadButton } from "@/features/schemas/components/SchemaRunBulkUploadButton";
import {
  usePredictionRunsForBookmark,
  usePredictionRunsFeedback,
  useSchema,
  useSchemaBookmark,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { isSchemaFeedbackComplete } from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";
import type { PredictionRunDto } from "@/features/schemas/api/prediction-types";

const EMPTY_RUNS: PredictionRunDto[] = [];

const inRange = (run: PredictionRunDto, range: SchemaRunDateRangeFilter): boolean => {
  if (range === "all") return true;
  const timestamp = Date.parse(run.updatedAt ?? run.createdAt);
  if (!Number.isFinite(timestamp)) return true;
  const now = new Date();
  const start = new Date(now);
  if (range === "today") start.setHours(0, 0, 0, 0);
  if (range === "last7") start.setDate(now.getDate() - 7);
  if (range === "last30") start.setDate(now.getDate() - 30);
  return timestamp >= start.getTime();
};

export function SchemaRunHistoryPage() {
  const navigate = useNavigate();
  const { schemaId, bookmarkId } = useParams<{
    schemaId: string;
    bookmarkId: string;
  }>();
  const { data: schema } = useSchema(schemaId);
  const { data: bookmark } = useSchemaBookmark(bookmarkId);
  const effectiveVersionId = bookmark?.versionId;
  const { data: version } = useSchemaVersion(effectiveVersionId);
  const executableVersion = useMemo(
    () => (version ? prepareSchemaVersionDtoForUse(version) : undefined),
    [version],
  );
  const bookmarkRuns = usePredictionRunsForBookmark(bookmarkId);
  const runs = bookmarkRuns.data ?? EMPTY_RUNS;
  const isLoading = bookmarkRuns.isLoading;
  const runFeedback = usePredictionRunsFeedback(runs);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SchemaRunStatusFilter>("all");
  const [feedbackStatus, setFeedbackStatus] = useState<SchemaRunFeedbackStatusFilter>("all");
  const [dateRange, setDateRange] = useState<SchemaRunDateRangeFilter>("all");
  const runHref = (runId: string) => `/schemas/${schemaId}/bookmarks/${bookmarkId}/runs/${runId}`;
  const feedbackStatusByRunId = useMemo(() => {
    if (!executableVersion) return new Map<string, "COMPLETED" | "PENDING">();
    return new Map(
      runs.map((run) => {
        const feedback = runFeedback.data.filter((item) =>
          run.results.some((result) => result.id === item.resultId),
        );
        const steps = buildSchemaFeedbackSteps(executableVersion, run.results, feedback);
        const complete = isSchemaFeedbackComplete(steps);
        return [run.id, complete ? "COMPLETED" : "PENDING"] as const;
      }),
    );
  }, [executableVersion, runFeedback.data, runs]);
  const filteredRuns = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return runs.filter((run) => {
      const matchesQuery =
        normalized.length === 0 ||
        [run.name, run.id, run.status].some((value) => value.toLowerCase().includes(normalized));
      const matchesStatus = status === "all" || run.status === status;
      const currentFeedbackStatus = feedbackStatusByRunId.get(run.id) ?? "PENDING";
      const matchesFeedback = feedbackStatus === "all" || currentFeedbackStatus === feedbackStatus;
      return matchesQuery && matchesStatus && matchesFeedback && inRange(run, dateRange);
    });
  }, [dateRange, feedbackStatus, feedbackStatusByRunId, query, runs, status]);

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-6 overflow-auto">
        <AppPageHeader
          title="Inference History"
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            { label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` },
            {
              label: executableVersion
                ? `${bookmark?.name ?? executableVersion.name} · v${executableVersion.version}`
                : "Version",
            },
            { label: "Inference History" },
          ]}
          description={
            executableVersion
              ? `${bookmark?.name ?? executableVersion.name} · v${executableVersion.version}`
              : undefined
          }
          actions={
            executableVersion ? (
              <>
                <SchemaRunReviewButton runs={runs} version={executableVersion} />
                <SchemaRunBulkUploadButton
                  version={executableVersion}
                  bookmarkId={bookmarkId ?? ""}
                />
                <Link to={`/schemas/${schemaId}/bookmarks/${bookmarkId}/runs/create`}>
                  <AppButton>
                    <Play size={16} />
                    Run
                  </AppButton>
                </Link>
              </>
            ) : null
          }
        />
        {executableVersion ? (
          <SchemaRunHistoryToolbar
            query={query}
            status={status}
            feedbackStatus={feedbackStatus}
            dateRange={dateRange}
            runs={filteredRuns}
            version={executableVersion}
            onQueryChange={setQuery}
            onStatusChange={setStatus}
            onFeedbackStatusChange={setFeedbackStatus}
            onDateRangeChange={setDateRange}
          />
        ) : null}
        {isLoading ? <AppPanel>Loading inference history...</AppPanel> : null}
        {runs.length > 0 ? (
          <SchemaRunHistoryTable
            runs={filteredRuns}
            feedbackStatusByRunId={feedbackStatusByRunId}
            onOpenRun={(runId) => navigate(runHref(runId))}
          />
        ) : !isLoading ? (
          <AppEmptyState
            title="No inferences yet"
            description="Run this bookmark to populate inference history."
            action={
              <Link to={`/schemas/${schemaId}/bookmarks/${bookmarkId}/runs/create`}>
                <AppButton>
                  <Play size={16} />
                  Run schema
                </AppButton>
              </Link>
            }
          />
        ) : null}
      </AppSurface>
    </AppPage>
  );
}
