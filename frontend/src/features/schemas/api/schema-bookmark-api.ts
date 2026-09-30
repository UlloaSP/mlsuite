import { appFetch, json } from "@/shared/api/http";
import type {
  CreateSchemaBookmarkRequest,
  PredictBookmarkDto,
  SchemaBookmarkDto,
} from "@/shared/api/openapi.gen";

export const getSchemaBookmarks = (
  schemaId: number | string,
  signal?: AbortSignal,
): Promise<SchemaBookmarkDto[]> =>
  appFetch<SchemaBookmarkDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/bookmarks`, {
    signal,
  });

/** Bookmarks of every active schema in the organization, for the Predict launcher. */
export const getOrganizationBookmarks = (signal?: AbortSignal): Promise<PredictBookmarkDto[]> =>
  appFetch<PredictBookmarkDto[]>("/api/schema-bookmarks", { signal });

export const getSchemaBookmark = (
  bookmarkId: number | string,
  signal?: AbortSignal,
): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(`/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}`, {
    signal,
  });

export const createSchemaBookmark = (
  schemaId: number | string,
  req: CreateSchemaBookmarkRequest,
): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(
    `/api/schemas/${encodeURIComponent(schemaId)}/bookmarks`,
    json("POST", req),
  );
