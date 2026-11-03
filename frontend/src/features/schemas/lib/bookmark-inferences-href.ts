/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { linkOptions } from "@tanstack/react-router";

/** A bookmark's saved inferences: the Inferences catalog filtered to it. */
export const bookmarkInferencesHref = (bookmark?: { id: number; schemaId: number }) =>
  linkOptions({
    to: "/inferences",
    search: bookmark
      ? { schema: String(bookmark.schemaId), bookmark: String(bookmark.id) }
      : undefined,
  });
