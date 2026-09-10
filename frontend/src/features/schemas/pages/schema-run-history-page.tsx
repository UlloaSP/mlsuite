/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Play } from "lucide-react";
import { useMemo } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useClientCatalogPage } from "@/shared/ui/catalog/useClientCatalogPage";
import { SchemaRunHistoryList } from "@/features/schemas/components/SchemaRunHistoryList";
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
import { schemaFeedbackStatus } from "@/capabilities/prediction-runtime/feedback/feedback-completion";
import { buildSchemaFeedbackSteps } from "@/capabilities/prediction-runtime/feedback/feedback-steps";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";
import type { PredictionRunDto } from "@/features/schemas/api/prediction-types";

import { runMatchesQuery } from "@/features/schemas/lib/run-matches-query";
import { questionnaireConfigError } from "@/capabilities/prediction-runtime/feedback/questionnaire-config";
import type { FeedbackStatusDisplay } from "@/capabilities/prediction-runtime/feedback/FeedbackStatusBadge";

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
  const bookmarkQuery = useSchemaBookmark(bookmarkId);
  const bookmark = bookmarkQuery.data;
  const effectiveVersionId = bookmark?.versionId;
  const versionQuery = useSchemaVersion(effectiveVersionId);
  const version = versionQuery.data;
  const executableVersion = useMemo(
    () => (version ? prepareSchemaVersionDtoForUse(version) : undefined),
    [version],
  );
  const bookmarkRuns = usePredictionRunsForBookmark(bookmarkId);
  const runs = bookmarkRuns.data ?? EMPTY_RUNS;
  const runFeedback = usePredictionRunsFeedback(runs);
  const questionnaireError = questionnaireConfigError(executableVersion?.formSchema);
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const status = filterValue<SchemaRunStatusFilter>(params.get("status"), [
    "SUCCESS",
    "PARTIAL_SUCCESS",
    "FAILED",
  ]);
  const feedbackStatus = filterValue<SchemaRunFeedbackStatusFilter>(params.get("feedback"), [
    "COMPLETED",
    "PENDING",
    "NOT_REQUIRED",
  ]);
  const dateRange = filterValue<SchemaRunDateRangeFilter>(params.get("date"), [
    "today",
    "last7",
    "last30",
  ]);
  const needsFeedback = feedbackStatus !== "all" && runs.length > 0;
  const loadError =
    bookmarkRuns.error ||
    (needsFeedback && (bookmarkQuery.error || versionQuery.error || runFeedback.error));
  const awaitingResults =
    !bookmarkRuns.isSuccess ||
    bookmarkRuns.isPlaceholderData ||
    (needsFeedback &&
      (!bookmarkQuery.isSuccess ||
        !versionQuery.isSuccess ||
        !runFeedback.isSuccess ||
        runFeedback.isPlaceholderData));
  const isLoading = awaitingResults && !loadError;
  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "" || value === "all") next.delete(key);
    else next.set(key, value);
    next.delete("page");
    setParams(next, { replace: true });
  };
  const runHref = (runId: string) => `/schemas/${schemaId}/bookmarks/${bookmarkId}/runs/${runId}`;
  const feedbackStatusByRunId = useMemo(() => {
    if (
      !executableVersion ||
      questionnaireError ||
      versionQuery.error ||
      runFeedback.error ||
      !runFeedback.isSuccess ||
      runFeedback.isPlaceholderData
    ) {
      const status: FeedbackStatusDisplay =
        questionnaireError || versionQuery.error || runFeedback.error ? "ERROR" : "LOADING";
      return new Map(runs.map((run) => [run.id, status]));
    }
    return new Map(
      runs.map((run) => {
        const feedback = runFeedback.data.filter((item) =>
          run.results.some((result) => result.id === item.resultId),
        );
        const steps = buildSchemaFeedbackSteps(executableVersion, run.results, feedback);
        return [run.id, schemaFeedbackStatus(steps)] as const;
      }),
    );
  }, [
    executableVersion,
    runFeedback.data,
    runFeedback.error,
    runFeedback.isSuccess,
    runFeedback.isPlaceholderData,
    versionQuery.error,
    runs,
    questionnaireError,
  ]);
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchesQuery = runMatchesQuery(run, query);
      const matchesStatus = status === "all" || run.status === status;
      const currentFeedbackStatus = feedbackStatusByRunId.get(run.id);
      const matchesFeedback = feedbackStatus === "all" || currentFeedbackStatus === feedbackStatus;
      return matchesQuery && matchesStatus && matchesFeedback && inRange(run, dateRange);
    });
  }, [dateRange, feedbackStatus, feedbackStatusByRunId, query, runs, status]);
  const pagination = useClientCatalogPage(
    filteredRuns,
    JSON.stringify([bookmarkId, query, status, feedbackStatus, dateRange]),
    awaitingResults,
  );

  if (questionnaireError)
    return (
      <AppPage>
        <AppEmptyState
          title="Invalid feedback questionnaire"
          description={questionnaireError}
          action={
            <Link to="/schemas">
              <AppButton>Back to schemas</AppButton>
            </Link>
          }
        />
      </AppPage>
    );

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
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
          actionLayout="checkerboard"
          actions={
            executableVersion ? (
              <>
                <SchemaRunReviewButton runs={runs} version={executableVersion} />
                <SchemaRunBulkUploadButton
                  version={executableVersion}
                  bookmarkId={bookmarkId ?? ""}
                />
                <Link to={`/schemas/${schemaId}/bookmarks/${bookmarkId}/runs/create`}>
                  <AppButton variant="secondary">
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
            onQueryChange={(value) => updateFilter("q", value)}
            onStatusChange={(value) => updateFilter("status", value)}
            onFeedbackStatusChange={(value) => updateFilter("feedback", value)}
            onDateRangeChange={(value) => updateFilter("date", value)}
          />
        ) : null}
        <CatalogListPanel
          {...pagination}
          itemCount={awaitingResults ? 0 : filteredRuns.length}
          isLoading={isLoading}
          isBusy={isLoading || bookmarkRuns.isFetching}
          loadingLabel="Loading inference history..."
          errorMessage={loadError ? "Could not load inference history." : null}
          onRetry={() => {
            void bookmarkRuns.refetch();
            if (needsFeedback) {
              void bookmarkQuery.refetch();
              void versionQuery.refetch();
              void runFeedback.refetch();
            }
          }}
          emptyState={{
            title: runs.length === 0 ? "No inferences yet" : "No matching inferences",
            description:
              runs.length === 0
                ? "Run this bookmark to populate inference history."
                : "Adjust the search or filters to see more results.",
            action:
              runs.length === 0 ? (
                <Link to={`/schemas/${schemaId}/bookmarks/${bookmarkId}/runs/create`}>
                  <AppButton>
                    <Play size={16} />
                    Run schema
                  </AppButton>
                </Link>
              ) : undefined,
          }}
        >
          <SchemaRunHistoryList
            runs={awaitingResults ? EMPTY_RUNS : pagination.visibleItems}
            feedbackStatusByRunId={feedbackStatusByRunId}
            onOpenRun={(runId) => navigate(runHref(runId))}
          />
        </CatalogListPanel>
      </AppSurface>
    </AppPage>
  );
}

function filterValue<T extends string>(value: string | null, allowed: readonly T[]): T | "all" {
  return allowed.includes(value as T) ? (value as T) : "all";
}
