import { getRouteApi } from "@tanstack/react-router";
import { BookmarkWorkspace } from "@/features/schemas/components/BookmarkWorkspace";

const route = getRouteApi("/protected/app/can-view-models/predict/$bookmarkId");

/** A new bookmark starts a fresh pinned snapshot and session. */
export function BookmarkWorkspacePage() {
  const { bookmarkId } = route.useParams();
  return <BookmarkWorkspace key={bookmarkId} bookmarkId={bookmarkId} />;
}
