import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import {
  listPublicBookmarks,
  type ModeratedBookmarkPageRequest,
} from "./public-bookmark-moderation.api";

/** Platform data: every organization's public bookmarks, so the key carries no tenant scope. */
const moderatedBookmarksQueryOptions = (request: ModeratedBookmarkPageRequest) =>
  queryOptions({
    queryKey: [
      "admin",
      "publicBookmarks",
      request.page,
      request.size,
      request.search,
      request.sort,
    ] as const,
    queryFn: ({ signal }) => listPublicBookmarks(request, signal),
    placeholderData: keepPreviousData,
  });

export const useModeratedBookmarks = (request: ModeratedBookmarkPageRequest, enabled: boolean) =>
  useQuery({ ...moderatedBookmarksQueryOptions(request), enabled });
