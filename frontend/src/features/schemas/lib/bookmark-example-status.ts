/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SchemaBookmarkDto, SchemaBookmarkExampleDto } from "@/shared/api/openapi.gen";

type StatusCopy = { label: string; tone: "info" | "neutral" | "warning" };

/** How each serving state of a marked run reads, wherever the workspace shows it. */
export const EXAMPLE_STATUS: Record<SchemaBookmarkExampleDto["status"], StatusCopy> = {
  SERVED: { label: "Served", tone: "info" },
  BOOKMARK_PRIVATE: { label: "Not served: bookmark is private", tone: "neutral" },
  // The run's inputs may not fit the form of the snapshot the bookmark points to now.
  BOOKMARK_MOVED: { label: "Not served: bookmark moved", tone: "warning" },
};

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

/**
 * What a bookmark's example counts mean for visitors. `served` is null when there is nothing
 * to say (a private bookmark without examples); `stale` only when it left examples behind.
 */
export const bookmarkExampleSummary = (
  bookmark: Pick<SchemaBookmarkDto, "exampleCount" | "staleExampleCount" | "visibility">,
) => ({
  served:
    bookmark.visibility === "PUBLIC"
      ? bookmark.exampleCount === 0
        ? "Serves no examples"
        : `Serves ${plural(bookmark.exampleCount, "example")}`
      : bookmark.exampleCount === 0
        ? null
        : `${plural(bookmark.exampleCount, "example")}, not served while private`,
  stale:
    bookmark.staleExampleCount === 0
      ? null
      : `${plural(bookmark.staleExampleCount, "example")} not served since the bookmark moved`,
});
