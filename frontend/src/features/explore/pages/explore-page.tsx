/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQuery } from "@tanstack/react-query";
import {
  PUBLIC_BOOKMARK_PAGE_SIZE,
  publicBookmarkPageQueryOptions,
} from "@/features/explore/api/public-bookmark-api";
import { PublicBookmarkCard } from "@/features/explore/components/PublicBookmarkCard";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { SECTION_ICONS } from "@/shared/ui/section-icons";

type FeedSort = "updated" | "name";

// The feed has one view of everything published: no categories to filter by.
const FILTERS: Array<{ value: "all"; label: string }> = [{ value: "all", label: "All" }];
const SORTS: Array<{ value: FeedSort; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "name", label: "Name" },
];

/**
 * The public feed: every published bookmark, the same for anonymous visitors and members
 * of any organization. It reads only the public API; the frame around it is chosen by the
 * router.
 */
export function ExplorePage() {
  const controls = useCatalogControls<"all", FeedSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "updated",
    sorts: SORTS.map(({ value }) => value),
  });
  const query = useQuery(
    publicBookmarkPageQueryOptions(controls.page, controls.search, controls.sort),
  );
  const ExploreIcon = SECTION_ICONS.explore;

  return (
    <CatalogResourcePage
      accessFallback={null}
      controls={controls}
      header={{
        title: "Explore",
        description: "Bookmarks that organizations have published for anyone to open.",
        breadcrumbs: [{ label: "Explore" }],
        breadcrumbScope: "public",
      }}
      layout="grid"
      loadingLabel="Loading public bookmarks…"
      pageSize={PUBLIC_BOOKMARK_PAGE_SIZE}
      filterLabel="Filter public bookmarks"
      filters={FILTERS}
      placeholder="Search by bookmark, schema, description, or publisher"
      query={query}
      sortLabel="Sort public bookmarks"
      sortOptions={SORTS}
      emptyIcon={<ExploreIcon size={22} />}
      emptyTitle="Nothing has been published yet"
      emptyDescription="Bookmarks appear here once an organization publishes one."
      filteredEmptyTitle="No matching bookmarks"
      filteredEmptyDescription="Try another search term."
      renderItem={(bookmark) => <PublicBookmarkCard key={bookmark.publicId} bookmark={bookmark} />}
    />
  );
}
