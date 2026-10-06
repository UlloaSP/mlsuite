import { appFetch, json } from "@/shared/api/http";
import type {
  CreateSchemaBookmarkRequest,
  PredictBookmarkDto,
  SchemaBookmarkDto,
  SchemaBookmarkExampleDto,
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

/** Opens the bookmark at its public link; the first publish assigns its public id. */
export const publishSchemaBookmark = (bookmarkId: number | string): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(`/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/publish`, {
    method: "POST",
  });

/** Makes the bookmark private again; it keeps its public id for a later publish. */
export const unpublishSchemaBookmark = (bookmarkId: number | string): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(`/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/unpublish`, {
    method: "POST",
  });

const bookmarkExamplesPath = (bookmarkId: number | string) =>
  `/api/schema-bookmarks/${encodeURIComponent(bookmarkId)}/examples`;

/** Every run marked as a public example of the bookmark, with whether it is being served. */
export const getBookmarkExamples = (
  bookmarkId: number | string,
  signal?: AbortSignal,
): Promise<SchemaBookmarkExampleDto[]> =>
  appFetch<SchemaBookmarkExampleDto[]>(bookmarkExamplesPath(bookmarkId), { signal });

export const markBookmarkExample = (
  bookmarkId: number | string,
  runId: number | string,
): Promise<SchemaBookmarkExampleDto> =>
  appFetch<SchemaBookmarkExampleDto>(
    `${bookmarkExamplesPath(bookmarkId)}/${encodeURIComponent(runId)}`,
    { method: "PUT" },
  );

export const unmarkBookmarkExample = (
  bookmarkId: number | string,
  runId: number | string,
): Promise<void> =>
  appFetch<void>(`${bookmarkExamplesPath(bookmarkId)}/${encodeURIComponent(runId)}`, {
    method: "DELETE",
  });
