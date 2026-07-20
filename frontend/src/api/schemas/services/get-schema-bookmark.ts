/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/shared/api/http";
import type { SchemaBookmarkDto } from "@/api/schemas/dtos";

export const getSchemaBookmark = (
  bookmarkId: string,
  signal?: AbortSignal,
): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(`/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}`, {
    signal,
  });
