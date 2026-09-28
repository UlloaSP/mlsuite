/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { FileJson2, History } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams, useSearchParams } from "react-router";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { prepareSchemaVersionDtoForUse } from "@/capabilities/prediction-runtime/mlform/binding-rebase";
import { AppButton } from "@/shared/ui/AppButton";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppInlineAlert } from "@/shared/ui/AppInlineAlert";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPage } from "@/shared/ui/AppPage";
import { AppSurface } from "@/shared/ui/AppSurface";
import { appButtonClass } from "@/shared/ui/button-styles";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import {
  useOrganizationBookmarks,
  useSchemaBookmark,
  useSchemaVersion,
} from "@/features/schemas/api/schema-queries";
import { BookmarkPredictPanel } from "@/features/schemas/components/BookmarkPredictPanel";
import { SchemaRunBulkUploadButton } from "@/features/schemas/components/SchemaRunBulkUploadButton";
import { bookmarkInferencesHref } from "@/features/schemas/lib/bookmark-inferences-href";
import { useInferenceSession } from "@/features/schemas/lib/use-inference-session";
import { snapshotLabel } from "@/shared/lib/snapshot-label";

/** One visit per bookmark: a new bookmark starts a fresh pinned snapshot and session. */
export function BookmarkWorkspacePage() {
  const { bookmarkId = "" } = useParams<{ bookmarkId: string }>();
  return <BookmarkWorkspace key={bookmarkId} bookmarkId={bookmarkId} />;
}

/**
 * Running a bookmark: its form, and the session of runs to keep or discard.
 * History, and each saved run, live in the Inferences catalog.
 */
function BookmarkWorkspace({ bookmarkId }: { bookmarkId: string }) {
  const { data: workspace } = useWorkspaceContext();
  const canRun = workspace?.permissions.canRunPredictions ?? false;
  const bookmarkQuery = useSchemaBookmark(bookmarkId);
  const bookmark = bookmarkQuery.data;
  // The snapshot is fixed when the page opens; moving the bookmark elsewhere
  // must not swap the form (or the saved runs' version) underneath the user.
  const [pinnedVersionId, setPinnedVersionId] = useState<string>();
  if (bookmark && pinnedVersionId === undefined) setPinnedVersionId(bookmark.versionId);
  const versionQuery = useSchemaVersion(pinnedVersionId);
  const version = useMemo(
    () => (versionQuery.data ? prepareSchemaVersionDtoForUse(versionQuery.data) : undefined),
    [versionQuery.data],
  );
  // The History count comes from the Predict catalog, which refreshes when runs are saved.
  const runCount = useOrganizationBookmarks().data?.find(
    (item) => String(item.id) === bookmarkId,
  )?.runCount;
  const session = useInferenceSession(bookmarkId, pinnedVersionId ?? "");
  const [params] = useSearchParams();
  // "Predict again" asks for a run's inputs with ?from=; the form keeps that source
  // until another is asked for.
  const requestedSource = params.get("from") ?? undefined;
  const [formSource, setFormSource] = useState(requestedSource);
  if (requestedSource && requestedSource !== formSource) setFormSource(requestedSource);
  const { detachForm } = session;
  useEffect(() => detachForm(), [detachForm, formSource]);
  const moved = bookmark && pinnedVersionId && bookmark.versionId !== pinnedVersionId;

  if (bookmarkQuery.isError)
    return (
      <AppPage>
        <AppEmptyState
          title="Bookmark unavailable"
          description="It may have been removed or belong to another organization."
          action={
            <Link to="/predict" className={appButtonClass()}>
              Back to Predict
            </Link>
          }
        />
      </AppPage>
    );

  // Members who cannot run predictions only have the history to look at.
  if (!canRun && bookmark) {
    return <Navigate to={bookmarkInferencesHref(bookmark)} replace />;
  }

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto lg:overflow-hidden">
        <AppPageHeader
          title={bookmark?.name ?? "Bookmark"}
          description={
            bookmark && version
              ? `${bookmark.schemaName} · ${snapshotLabel(version.name, version.version)}`
              : undefined
          }
          breadcrumbs={[
            { label: "Predict", to: "/predict" },
            { label: bookmark?.name ?? "Bookmark" },
          ]}
          actions={
            <>
              <Link
                to={bookmarkInferencesHref(bookmark)}
                className={appButtonClass({ variant: "secondary" })}
              >
                <History size={16} />
                History
                {runCount !== undefined ? (
                  <span className="tabular-nums text-fg-muted">{runCount}</span>
                ) : null}
              </Link>
              {version && canRun ? (
                <SchemaRunBulkUploadButton version={version} bookmarkId={bookmarkId} />
              ) : null}
              {bookmark ? (
                <Link
                  to={`/schemas/${bookmark.schemaId}`}
                  className={appButtonClass({ variant: "secondary" })}
                >
                  <FileJson2 size={16} />
                  Schema
                </Link>
              ) : null}
            </>
          }
        />
        {moved ? (
          <AppInlineAlert>
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span>
                This bookmark now points to v{bookmark.version}. Runs of v{version?.version} can no
                longer be saved to it.
              </span>
              <AppButton
                size="sm"
                variant="secondary"
                disabled={session.unsavedCount > 0}
                title={session.unsavedCount > 0 ? "Save or discard the session first" : undefined}
                onClick={() => {
                  session.detachForm();
                  setPinnedVersionId(bookmark.versionId);
                }}
              >
                Use v{bookmark.version}
              </AppButton>
            </span>
          </AppInlineAlert>
        ) : null}
        {version && canRun ? (
          <BookmarkPredictPanel version={version} session={session} fromRunId={formSource} />
        ) : versionQuery.isError ? (
          <AppEmptyState
            compact
            title="Schema version unavailable"
            description="The snapshot this bookmark points to could not be loaded."
          />
        ) : (
          <AppLoadingState label="Loading schema version…" rows={3} />
        )}
      </AppSurface>
    </AppPage>
  );
}
