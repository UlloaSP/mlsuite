import { appFetch, json } from "@/shared/api/http";
import type {
  CreateSchemaBookmarkRequest,
  PredictBookmarkDto,
  SchemaBookmarkDto,
} from "./schema-types";

export const getSchemaBookmarks = (
  schemaId: string,
  signal?: AbortSignal,
): Promise<SchemaBookmarkDto[]> =>
  appFetch<SchemaBookmarkDto[]>(`/api/schemas/${encodeURIComponent(schemaId)}/bookmarks`, {
    signal,
  });

/** Bookmarks of every active schema in the organization, for the Predict launcher. */
export const getOrganizationBookmarks = (signal?: AbortSignal): Promise<PredictBookmarkDto[]> =>
  appFetch<PredictBookmarkDto[]>("/api/schema-bookmarks", { signal });

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
