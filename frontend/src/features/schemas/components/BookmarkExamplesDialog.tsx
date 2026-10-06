/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Link } from "react-router";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { useSetBookmarkExampleMutation } from "@/features/schemas/api/schema-mutations";
import { useBookmarkExamples } from "@/features/schemas/api/schema-queries";
import { bookmarkInferencesHref } from "@/features/schemas/lib/bookmark-inferences-href";
import { EXAMPLE_STATUS } from "@/features/schemas/lib/bookmark-example-status";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { AppDialog } from "@/shared/ui/AppDialog";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { appButtonClass } from "@/shared/ui/button-styles";
import { cx } from "@/shared/ui/cx";
import { FOCUS_RING } from "@/shared/ui/focus-ring";
import type { SchemaBookmarkDto } from "@/shared/api/openapi.gen";

type Props = {
  bookmark: SchemaBookmarkDto;
  open: boolean;
  onClose: () => void;
};

/**
 * The runs marked as public examples of a bookmark, each with whether visitors are being
 * offered it. Runs are marked from their own page; here they can only be reviewed and removed.
 */
export function BookmarkExamplesDialog({ bookmark, open, onClose }: Props) {
  const examples = useBookmarkExamples(open ? bookmark.id : undefined);
  const canPublish = useCan("canPublishBookmarks");
  const setExample = useSetBookmarkExampleMutation();

  return (
    <AppDialog
      open={open}
      size="md"
      onClose={() => {
        setExample.reset();
        onClose();
      }}
      title={`Public examples of ${bookmark.name}`}
      description="Runs whose inputs visitors can load into the public form. Only runs of the snapshot the bookmark points to are served, and only while it is public."
      error={setExample.error?.message}
    >
      {examples.isPending ? (
        <AppLoadingState compact label="Loading examples…" />
      ) : examples.isError ? (
        <AppEmptyState
          compact
          title="Examples could not be loaded"
          action={<AppButton onClick={() => void examples.refetch()}>Try again</AppButton>}
        />
      ) : examples.data.length === 0 ? (
        <AppEmptyState
          compact
          title="No examples yet"
          description={
            canPublish
              ? "Open a saved inference of this bookmark and mark it as a public example."
              : "Members who may publish bookmarks choose the examples."
          }
          action={
            <Link
              to={bookmarkInferencesHref(bookmark)}
              className={appButtonClass({ variant: "secondary" })}
            >
              Open its inferences
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {examples.data.map((example) => (
            <li key={example.runId} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <Link
                  to={`/inferences/${example.runId}`}
                  className={cx(
                    "block truncate rounded-control text-sm font-semibold text-fg hover:underline",
                    FOCUS_RING,
                  )}
                >
                  {example.runName}
                </Link>
                <p className="text-xs text-fg-muted">
                  Ran on {snapshotLabel(example.runVersionName, example.runVersion)}
                </p>
              </div>
              <AppBadge tone={EXAMPLE_STATUS[example.status].tone}>
                {EXAMPLE_STATUS[example.status].label}
              </AppBadge>
              {canPublish ? (
                <AppButton
                  size="sm"
                  variant="secondary"
                  disabled={setExample.isPending}
                  aria-label={`Remove ${example.runName} from the examples`}
                  onClick={() =>
                    setExample.mutate({ bookmark, runId: example.runId, example: false })
                  }
                >
                  Remove
                </AppButton>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </AppDialog>
  );
}
