/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "../../core/services/app-fetch";
import type { SchemaBookmarkDto } from "../dtos";

export const getSchemaBookmark = (bookmarkId: string): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(`/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}`);
