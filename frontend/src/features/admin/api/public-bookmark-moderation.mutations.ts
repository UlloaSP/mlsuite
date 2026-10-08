import { useMutation, useQueryClient } from "@tanstack/react-query";
import { unpublishPublicBookmark } from "./public-bookmark-moderation.api";

export const useUnpublishPublicBookmark = () => {
  const queryClient = useQueryClient();
  return useMutation({
    meta: { errorHandledLocally: true },
    mutationFn: unpublishPublicBookmark,
    // The bookmark is also cached as its public page and in its organization's catalogs, which
    // belong to other features, so everything cached is marked stale rather than this list alone.
    onSuccess: () => queryClient.invalidateQueries(),
  });
};
