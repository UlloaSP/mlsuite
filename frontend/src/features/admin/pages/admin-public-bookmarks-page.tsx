/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Globe } from "lucide-react";
import { toast } from "sonner";
import { useUnpublishPublicBookmark } from "@/features/admin/api/public-bookmark-moderation.mutations";
import { useModeratedBookmarks } from "@/features/admin/api/public-bookmark-moderation.queries";
import { ModeratedBookmarkTile } from "@/features/admin/components/ModeratedBookmarkTile";
import { useUser } from "@/capabilities/workspace-context/session";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { NotFoundError } from "@/shared/ui/RouteStatusPage";
import type { ModeratedBookmarkDto } from "@/shared/api/openapi.gen";

const PAGE_SIZE = 8;
type BookmarkFilterMode = "all";
type BookmarkSortMode = "updated" | "name" | "organization";

const FILTERS: Array<{ value: BookmarkFilterMode; label: string }> = [
  { value: "all", label: "All" },
];

const SORT_OPTIONS: Array<{ value: BookmarkSortMode; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "name", label: "Name" },
  { value: "organization", label: "Organization" },
];

/** Moderation: every bookmark that is public on this instance, whichever organization owns it. */
export function AdminPublicBookmarksPage() {
  const { data: user, error } = useUser();
  const controls = useCatalogControls<BookmarkFilterMode, BookmarkSortMode>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "updated",
    sorts: SORT_OPTIONS.map(({ value }) => value),
  });
  const canView = user?.systemRole === "SUPERADMIN";
  const pageQuery = useModeratedBookmarks(
    { page: 0, search: controls.search, size: PAGE_SIZE, sort: controls.sort },
    canView,
  );
  const unpublish = useUnpublishPublicBookmark();

  const remove = async (bookmark: ModeratedBookmarkDto) => {
    // Failures propagate to the confirmation dialog, which stays open and shows them.
    await unpublish.mutateAsync(bookmark.id);
    toast.success(`${bookmark.name} is private again.`);
  };

  return (
    <CatalogResourcePage
      accessDenied={!canView || Boolean(error)}
      accessFallback={<NotFoundError />}
      controls={controls}
      header={{
        eyebrow: "Superadmin",
        title: "Public bookmarks",
        description:
          "Review what every organization has published and unpublish what should not be public.",
        breadcrumbScope: "platform",
        breadcrumbs: [{ label: "Public bookmarks" }],
      }}
      isActionPending={unpublish.isPending}
      loadingLabel="Loading public bookmarks…"
      filterLabel="Filter public bookmarks"
      filters={FILTERS}
      placeholder="Search by bookmark, schema, or organization"
      query={pageQuery}
      sortLabel="Sort public bookmarks"
      sortOptions={SORT_OPTIONS}
      emptyIcon={<Globe size={22} />}
      emptyTitle="No public bookmarks"
      filteredEmptyTitle="No matching public bookmarks"
      emptyDescription="Nothing on this instance is published. Bookmarks appear here when an organization publishes them."
      filteredEmptyDescription="Try another search term."
      renderItem={(item) => (
        <ModeratedBookmarkTile
          key={item.id}
          disabled={unpublish.isPending}
          item={item}
          onUnpublish={() => remove(item)}
        />
      )}
    />
  );
}
