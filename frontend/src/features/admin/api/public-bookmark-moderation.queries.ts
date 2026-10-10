import { useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import {
  listPublicBookmarks,
  type ModeratedBookmarkPageRequest,
} from "./public-bookmark-moderation.api";

export const useModeratedBookmarks = (request: ModeratedBookmarkPageRequest, enabled: boolean) =>
  useInfiniteCatalog({
    queryKey: ["admin", "publicBookmarks", "infinite", request.size, request.search, request.sort],
    queryFn: (page, signal) => listPublicBookmarks({ ...request, page }, signal),
    enabled,
  });
