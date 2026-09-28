/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useUser } from "@/capabilities/workspace-context/session";
import { useOrganizationBookmarks } from "@/features/schemas/api/schema-queries";
import { useUnsavedSessionRuns } from "@/features/schemas/lib/inference-session-store";
import { snapshotLabel } from "@/shared/lib/snapshot-label";
import { AppBadge } from "@/shared/ui/AppBadge";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { FactList } from "./FactList";

/** A Predict bookmark: what it runs, how it has been used, and runs left unsaved. */
export function BookmarkVisitFacts({ bookmarkId }: { bookmarkId: string }) {
  const bookmark = useOrganizationBookmarks().data?.find((item) => String(item.id) === bookmarkId);
  const unsaved = useUnsavedSessionRuns(useUser().data?.id, bookmarkId);
  if (!bookmark) return null;
  const extraModels = bookmark.models.length - 2;
  return (
    <FactList
      facts={[
        ...(unsaved > 0
          ? [{ label: "Session", value: <AppBadge tone="warning">{unsaved} unsaved</AppBadge> }]
          : []),
        { label: "Schema", value: bookmark.schemaName },
        {
          label: "Snapshot",
          value:
            bookmark.latestVersion > bookmark.version ? (
              <>
                {snapshotLabel(bookmark.versionName, bookmark.version)}{" "}
                <AppBadge tone="warning">v{bookmark.latestVersion} available</AppBadge>
              </>
            ) : (
              snapshotLabel(bookmark.versionName, bookmark.version)
            ),
        },
        {
          label: "Models",
          value: `${bookmark.models.slice(0, 2).join(", ")}${extraModels > 0 ? ` +${extraModels}` : ""}`,
        },
        { label: "Inputs", value: bookmark.fieldCount },
        { label: "Saved inferences", value: bookmark.runCount },
        {
          label: "Last run",
          value: bookmark.lastRunAt ? (
            <>
              <LiveRelativeTime value={bookmark.lastRunAt} /> ago
            </>
          ) : (
            "Never"
          ),
        },
      ]}
    />
  );
}
