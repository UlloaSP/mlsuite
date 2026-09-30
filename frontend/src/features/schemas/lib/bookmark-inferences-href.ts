/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** A bookmark's saved inferences: the Inferences catalog filtered to it. */
export const bookmarkInferencesHref = (bookmark?: { id: number; schemaId: number }) =>
  bookmark
    ? `/inferences?${new URLSearchParams({
        schema: String(bookmark.schemaId),
        bookmark: String(bookmark.id),
      })}`
    : "/inferences";
