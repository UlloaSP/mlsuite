import { mutationOptions, useMutation } from "@tanstack/react-query";
import { unpublishPublicBookmark } from "./public-bookmark-moderation.api";

const unpublishMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: unpublishPublicBookmark,
  // The bookmark is also cached on the public site and in its organization's catalogs, which
  // belong to other features: this list, every public page and the tenant data are marked stale.
  onSuccess: (_data, _publicId, _result, { client }) =>
    Promise.all(
      [["admin", "publicBookmarks"], ["public"], ["org"]].map((queryKey) =>
        client.invalidateQueries({ queryKey }),
      ),
    ),
});

export const useUnpublishPublicBookmark = () => useMutation(unpublishMutation);
