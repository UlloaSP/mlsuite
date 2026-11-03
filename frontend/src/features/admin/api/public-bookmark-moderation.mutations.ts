import { mutationOptions, useMutation } from "@tanstack/react-query";
import { unpublishPublicBookmark } from "./public-bookmark-moderation.api";

const unpublishMutation = mutationOptions({
  meta: { errorHandledLocally: true },
  mutationFn: unpublishPublicBookmark,
  // The bookmark is also cached as its public page and in its organization's catalogs, which
  // belong to other features, so everything cached is marked stale rather than this list alone.
  onSuccess: (_data, _publicId, _result, { client }) => client.invalidateQueries(),
});

export const useUnpublishPublicBookmark = () => useMutation(unpublishMutation);
