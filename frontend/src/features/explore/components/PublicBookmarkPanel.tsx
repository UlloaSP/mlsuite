/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCallback, useMemo, useState } from "react";
import { usePublicRunCatalog, usePublicRunDetail } from "@/features/explore/api/public-catalog-api";
import { PublicBookmarkForm } from "@/features/explore/components/PublicBookmarkForm";
import { PublicRunSession } from "@/features/explore/components/PublicRunSession";
import { PublicRunView } from "@/features/explore/components/PublicRunView";
import {
  buildPublicFeedbackSteps,
  isPublicRunReviewed,
} from "@/features/explore/lib/public-feedback-steps";
import { AppButton } from "@/shared/ui/AppButton";
import type { PublicBookmarkDto, PublicRunDto } from "@/shared/api/openapi.gen";

type Props = {
  bookmark: PublicBookmarkDto;
};

const NO_RUNS: PublicRunDto[] = [];

/**
 * The public page's working area, laid out like the workspace's run page: the form, and beside
 * it the runs this browser made, which the server keeps. The newest run lives in the form and
 * can be reviewed from there; choosing an earlier one shows it in the form's place until the
 * visitor goes back. The form is hidden, not unmounted, meanwhile: its values stay.
 */
export function PublicBookmarkPanel({ bookmark }: Props) {
  const runsQuery = usePublicRunCatalog(bookmark.publicId);
  const runs = runsQuery.data?.items ?? NO_RUNS;
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [latestId, setLatestId] = useState<number | null>(null);
  const viewingQuery = usePublicRunDetail(
    bookmark.publicId,
    viewingId,
    runs.find((run) => run.id === viewingId),
  );
  const viewing = viewingQuery.data ?? null;
  const latest = usePublicRunDetail(bookmark.publicId, latestId).data ?? null;

  const onRun = useCallback((run: PublicRunDto) => {
    setLatestId(run.id);
    setViewingId(null);
  }, []);
  // Whether a run's review is complete follows from its kept answers; read once per run list.
  const reviewed = useMemo(() => {
    const byId = new Map(
      runs.map((run) => [
        run.id,
        run.version === bookmark.version &&
          isPublicRunReviewed(buildPublicFeedbackSteps(bookmark.formSchema, run)),
      ]),
    );
    return (run: PublicRunDto) =>
      byId.get(run.id) ??
      (run.version === bookmark.version &&
        isPublicRunReviewed(buildPublicFeedbackSteps(bookmark.formSchema, run)));
  }, [bookmark.formSchema, bookmark.version, runs]);

  return (
    <div className="flex flex-none flex-col gap-4 lg:min-h-0 lg:flex-1 lg:flex-row">
      <section aria-label="Form" className="flex min-w-0 flex-none flex-col lg:min-h-128 lg:flex-1">
        {viewingQuery.error ? (
          <p role="alert">
            {viewingQuery.error.message}{" "}
            <AppButton onClick={() => void viewingQuery.refetch()}>Retry</AppButton>
            <AppButton onClick={() => setViewingId(null)}>Back to form</AppButton>
          </p>
        ) : null}
        {viewing ? (
          <PublicRunView
            key={viewing.id}
            bookmark={bookmark}
            run={viewing}
            onBack={() => setViewingId(null)}
          />
        ) : null}
        <div className={viewingId !== null ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
          <PublicBookmarkForm
            // A republished or moved bookmark is a new form, not an update of the mounted one.
            key={`${bookmark.publicId}:${bookmark.version}`}
            publicId={bookmark.publicId}
            version={bookmark.version}
            formSchema={bookmark.formSchema}
            onRun={onRun}
          />
        </div>
      </section>
      <PublicRunSession
        runs={runs}
        query={runsQuery}
        loading={runsQuery.isPending}
        reviewed={reviewed}
        selectedId={viewing?.id ?? latest?.id ?? null}
        onSelect={(run) => setViewingId(run.id)}
      />
    </div>
  );
}
