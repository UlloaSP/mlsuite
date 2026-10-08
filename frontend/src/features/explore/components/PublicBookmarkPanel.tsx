/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { publicRunsQueryOptions } from "@/features/explore/api/public-bookmark-api";
import { PublicBookmarkForm } from "@/features/explore/components/PublicBookmarkForm";
import { PublicRunSession } from "@/features/explore/components/PublicRunSession";
import { PublicRunView } from "@/features/explore/components/PublicRunView";
import {
  buildPublicFeedbackSteps,
  isPublicRunReviewed,
} from "@/features/explore/lib/public-feedback-steps";
import { AppButton } from "@/shared/ui/AppButton";
import type {
  PublicBookmarkDto,
  PublicBookmarkExampleDto,
  PublicRunDto,
} from "@/shared/api/openapi.gen";

type Props = {
  bookmark: PublicBookmarkDto;
  examples?: readonly PublicBookmarkExampleDto[];
};

const NO_RUNS: PublicRunDto[] = [];

/**
 * The public page's working area, laid out like the workspace's run page: the form, and beside
 * it the runs this browser made, which the server keeps. The newest run lives in the form and
 * can be reviewed from there; choosing an earlier one shows it in the form's place until the
 * visitor goes back. The form is hidden, not unmounted, meanwhile: its values stay.
 */
export function PublicBookmarkPanel({ bookmark, examples }: Props) {
  const queryClient = useQueryClient();
  const runsQuery = useQuery(publicRunsQueryOptions(bookmark.publicId));
  const runs = runsQuery.data ?? NO_RUNS;
  const [viewingId, setViewingId] = useState<number | null>(null);
  const [latestId, setLatestId] = useState<number | null>(null);
  const viewing = runs.find((run) => run.id === viewingId) ?? null;
  const latest = runs.find((run) => run.id === latestId) ?? null;

  const onRun = useCallback(
    (run: PublicRunDto) => {
      const { queryKey } = publicRunsQueryOptions(bookmark.publicId);
      queryClient.setQueryData(queryKey, (current: PublicRunDto[] | undefined) => [
        run,
        ...(current ?? []).filter((item) => item.id !== run.id),
      ]);
      setLatestId(run.id);
      setViewingId(null);
    },
    [bookmark.publicId, queryClient],
  );
  // Whether a run's review is complete follows from its kept answers; read once per run list.
  const reviewed = useMemo(() => {
    const byId = new Map(
      runs.map((run) => [
        run.id,
        run.version === bookmark.version &&
          isPublicRunReviewed(buildPublicFeedbackSteps(bookmark.formSchema, run)),
      ]),
    );
    return (run: PublicRunDto) => byId.get(run.id) ?? false;
  }, [bookmark.formSchema, bookmark.version, runs]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
      <section aria-label="Form" className="flex min-h-0 min-w-0 flex-1 flex-col lg:min-h-128">
        {viewing ? (
          <PublicRunView
            key={viewing.id}
            bookmark={bookmark}
            run={viewing}
            onBack={() => setViewingId(null)}
          />
        ) : null}
        <div className={viewing ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
          <PublicBookmarkForm
            // A republished or moved bookmark is a new form, not an update of the mounted one.
            key={`${bookmark.publicId}:${bookmark.version}`}
            publicId={bookmark.publicId}
            version={bookmark.version}
            formSchema={bookmark.formSchema}
            examples={examples}
            onRun={onRun}
            afterRun={
              latest ? (
                <div
                  aria-live="polite"
                  data-kept-run
                  className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface-subtle px-4 py-3 text-sm"
                >
                  <span className="text-fg-secondary">
                    This run is kept in your runs, with its results.
                  </span>
                  <AppButton size="sm" variant="secondary" onClick={() => setViewingId(latest.id)}>
                    <ClipboardCheck size={14} />
                    {reviewed(latest) ? "See your review" : "Review this run"}
                  </AppButton>
                </div>
              ) : null
            }
          />
        </div>
      </section>
      <PublicRunSession
        runs={runs}
        loading={runsQuery.isPending}
        reviewed={reviewed}
        selectedId={viewing?.id ?? latest?.id ?? null}
        onSelect={(run) => setViewingId(run.id)}
      />
    </div>
  );
}
