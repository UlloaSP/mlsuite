import { appFetch } from "@/shared/api/http";
import type { PageDtoModeratedBookmarkDto, SchemaBookmarkDto } from "@/shared/api/openapi.gen";

export type ModeratedBookmarkPageRequest = {
  page: number;
  search: string;
  size: number;
  sort: string;
};

export const listPublicBookmarks = (
  { page, search, size, sort }: ModeratedBookmarkPageRequest,
  signal?: AbortSignal,
): Promise<PageDtoModeratedBookmarkDto> => {
  const params = new URLSearchParams({ page: String(page), search, size: String(size), sort });
  return appFetch<PageDtoModeratedBookmarkDto>(`/api/admin/public-bookmarks?${params.toString()}`, {
    signal,
  });
};

export const unpublishPublicBookmark = (bookmarkId: number): Promise<SchemaBookmarkDto> =>
  appFetch<SchemaBookmarkDto>(`/api/admin/public-bookmarks/${bookmarkId}/unpublish`, {
    method: "POST",
  });
