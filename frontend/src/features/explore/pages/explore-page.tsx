/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { usePublicBookmarkCatalog } from "@/features/explore/api/public-bookmark-api";
import { ExploreVisitorIntro } from "@/features/explore/components/ExploreVisitorIntro";
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
  const query = usePublicBookmarkCatalog(controls.search, controls.sort);
  const ExploreIcon = SECTION_ICONS.explore;

  return (
    <CatalogResourcePage
      accessFallback={null}
      controls={controls}
      header={{
        title: "Explore",
        description: "Bookmarks that organizations have published for anyone to open.",
        breadcrumbs: [{ label: "Explore" }],
      }}
      navigation={<ExploreVisitorIntro />}
      layout="grid"
      loadingLabel="Loading public bookmarks…"
      filterLabel="Filter public bookmarks"
      filters={FILTERS}
      placeholder="Search by bookmark, description, or publisher"
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
