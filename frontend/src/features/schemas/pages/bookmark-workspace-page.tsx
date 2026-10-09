import { useParams } from "react-router";
import { BookmarkWorkspace } from "@/features/schemas/components/BookmarkWorkspace";

/** A new bookmark starts a fresh pinned snapshot and session. */
export function BookmarkWorkspacePage() {
  const { bookmarkId = "" } = useParams<{ bookmarkId: string }>();
  return <BookmarkWorkspace key={bookmarkId} bookmarkId={bookmarkId} />;
}
