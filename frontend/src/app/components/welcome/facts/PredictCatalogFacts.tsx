/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useOrganizationBookmarks } from "@/features/schemas/api/schema-queries";
import { LiveRelativeTime } from "@/shared/ui/LiveRelativeTime";
import { FactList } from "@/app/components/welcome/FactList";

/** The Predict launcher: what there is to run and what was run last. */
export function PredictCatalogFacts() {
  const bookmarks = useOrganizationBookmarks().data;
  if (!bookmarks) return null;
  const behind = bookmarks.filter((bookmark) => bookmark.latestVersion > bookmark.version).length;
  const latest = bookmarks
    .filter((bookmark) => bookmark.lastRunAt)
    .sort((left, right) => (right.lastRunAt ?? "").localeCompare(left.lastRunAt ?? ""))[0];
  return (
    <FactList
      facts={[
        { label: "Bookmarks", value: bookmarks.length },
        { label: "Update available", value: behind },
        {
          label: "Saved inferences",
          value: bookmarks.reduce((total, bookmark) => total + bookmark.runCount, 0),
        },
        {
          label: "Last run",
          value: latest?.lastRunAt ? (
            <>
              {latest.name} · <LiveRelativeTime value={latest.lastRunAt} /> ago
            </>
          ) : (
            "Nothing run yet"
          ),
        },
      ]}
    />
  );
}
