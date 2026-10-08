/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { toast } from "sonner";
import { useCan } from "@/capabilities/workspace-context/workspace-context";
import { useSetBookmarkExampleMutation } from "@/features/schemas/api/schema-mutations";
import { useBookmarkExamples, useSchemaBookmark } from "@/features/schemas/api/schema-queries";
import { EXAMPLE_STATUS } from "@/features/schemas/lib/bookmark-example-status";
import { AppBadge } from "@/shared/ui/AppBadge";
import { AppButton } from "@/shared/ui/AppButton";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import type { PredictionRunDto } from "@/shared/api/openapi.gen";

/**
 * Whether a saved run is a public example of the bookmark it was run through, and, for members
 * who may publish, the way to mark or unmark it. Runs are marked one at a time, here, because
 * this is where a member can read the inputs they are about to make public.
 */
export function RunPublicExampleControl({ run }: { run: PredictionRunDto }) {
  const bookmarkId = run.schemaBookmarkId ?? undefined;
  const { data: bookmark } = useSchemaBookmark(bookmarkId);
  const { data: examples } = useBookmarkExamples(bookmarkId);
  const canPublish = useCan("canPublishBookmarks");
  const setExample = useSetBookmarkExampleMutation();
  const { confirm, dialog } = useActionDialog();
  if (!bookmark || !examples) return null;

  const example = examples.find((item) => item.runId === run.id);
  const status = example ? EXAMPLE_STATUS[example.status] : null;
  const onPinnedSnapshot = run.schemaVersionId === bookmark.versionId;
  // A member who cannot publish sees the state of an example, and nothing for other runs.
  if (!status && !canPublish) return null;

  const change = (next: boolean) =>
    setExample.mutate(
      { bookmark, runId: run.id, example: next },
      {
        onSuccess: () => toast.success(next ? "Marked as public example" : "Example removed"),
        onError: (error) =>
          toast.error(next ? "Could not mark the example" : "Could not remove the example", {
            description: error.message,
          }),
      },
    );

  const mark = async () => {
    const confirmed = await confirm({
      title: `Mark ${run.name} as a public example?`,
      description: `While ${bookmark.name} is public, anyone can load this run's name and the input values shown here into its form. Outputs, the author and dates stay private.`,
      confirmLabel: "Mark as example",
    });
    if (confirmed) change(true);
  };

  return (
    <span className="flex flex-wrap items-center gap-3">
      {status ? (
        <span className="flex items-center gap-2">
          <span className="text-fg-muted">Public example</span>
          <AppBadge tone={status.tone}>{status.label}</AppBadge>
        </span>
      ) : null}
      {canPublish && example ? (
        <AppButton
          size="sm"
          variant="secondary"
          disabled={setExample.isPending}
          onClick={() => change(false)}
        >
          Remove example
        </AppButton>
      ) : null}
      {canPublish && !example ? (
        <AppButton
          size="sm"
          variant="secondary"
          disabled={setExample.isPending || !onPinnedSnapshot}
          title={
            onPinnedSnapshot
              ? undefined
              : `${bookmark.name} now points to another snapshot; only runs of that snapshot can be its examples`
          }
          onClick={() => void mark()}
        >
          Mark as public example
        </AppButton>
      ) : null}
      {dialog}
    </span>
  );
}
