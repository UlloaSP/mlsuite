/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch } from "@/api/core/services/app-fetch";
import { json } from "@/api/core/services/json";
import type { CreateSchemaBookmarkRequest, SchemaBookmarkDto } from "@/api/schemas/dtos";

export const createSchemaBookmark = (
  schemaId: string,
  req: CreateSchemaBookmarkRequest,
): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/bookmarks`,
    json("POST", req),
  );
