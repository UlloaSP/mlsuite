/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/** A bookmark's saved inferences: the Inferences catalog filtered to it. */
export const bookmarkInferencesHref = (bookmark?: { id: string; schemaId: string }) =>
  bookmark
    ? `/inferences?${new URLSearchParams({ schema: bookmark.schemaId, bookmark: bookmark.id })}`
    : "/inferences";
