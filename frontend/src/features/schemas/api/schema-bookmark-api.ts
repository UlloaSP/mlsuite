import { appFetch, json } from "@/shared/api/http";
import type { CreateSchemaBookmarkRequest, SchemaBookmarkDto } from "./schema-types";

export const getSchemaBookmarks = (
  schemaId: string,
  signal?: AbortSignal,
): Promise<SchemaBookmarkDto[]> =>
  appFetch<SchemaBookmarkDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/bookmarks`, {
    signal,
  });

export const getSchemaBookmark = (
  bookmarkId: string,
  signal?: AbortSignal,
): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(`/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}`, {
    signal,
  });

export const createSchemaBookmark = (
  schemaId: string,
  req: CreateSchemaBookmarkRequest,
): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/bookmarks`,
    json("POST", req),
  );
