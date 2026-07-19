/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Tags } from "lucide-react";
import { useMemo } from "react";
import { useParams } from "react-router";
import { CatalogResourcePage, useCatalogControls } from "@/app/components";
import type { SchemaBookmarkDto } from "@/api/schemas/dtos";
import {
  useSchema,
  useSchemaBookmarks,
  useSchemaDrafts,
  useSchemaVersions,
} from "@/api/schemas/hooks";
import { sortSchemaVersions } from "@/algorithms/schema/version-selection";
import { SchemaBookmarkCatalogItem } from "@/schemas/components/SchemaBookmarkCatalogItem";
import { SchemaRepoNav } from "@/schemas/components/SchemaRepoNav";

const EMPTY_BOOKMARKS: never[] = [];
const EMPTY_DRAFTS: never[] = [];
const EMPTY_VERSIONS: never[] = [];
type BookmarkFilter = "all" | "latest" | "older";
type BookmarkSort = "updated" | "name" | "version";

const PAGE_SIZE = 10;
const FILTERS: Array<{ value: BookmarkFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "latest", label: "Latest" },
  { value: "older", label: "Older" },
];
const SORTS: Array<{ value: BookmarkSort; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "name", label: "Name" },
  { value: "version", label: "Version" },
];

export function SchemaBookmarksPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: drafts = EMPTY_DRAFTS } = useSchemaDrafts(schemaId);
  const bookmarksQuery = useSchemaBookmarks(schemaId);
  const { data: versions = EMPTY_VERSIONS } = useSchemaVersions(schemaId);
  const controls = useCatalogControls<BookmarkFilter, BookmarkSort>({
    initialFilter: "all",
    initialSort: "updated",
    resetKey: schemaId,
  });
  const bookmarks = bookmarksQuery.data ?? EMPTY_BOOKMARKS;
  const sortedVersions = useMemo(() => sortSchemaVersions(versions), [versions]);
  const latestVersion = sortedVersions[0]?.version;
  const filtered = useMemo(
    () =>
      filterBookmarks(bookmarks, controls.search, controls.filter, controls.sort, latestVersion),
    [bookmarks, controls.filter, controls.search, controls.sort, latestVersion],
  );
  const pageItems = filtered.slice(controls.page * PAGE_SIZE, (controls.page + 1) * PAGE_SIZE);

  return (
    <CatalogResourcePage
      accessFallback={null}
      controls={controls}
      navigation={
        schemaId ? (
          <SchemaRepoNav
            active="bookmarks"
            schemaId={schemaId}
            changes={drafts.length}
            bookmarks={bookmarks.length}
            snapshots={sortedVersions.length}
          />
        ) : null
      }
      header={{
        title: "Bookmarks",
        description: "Operational tags that point to exact published snapshots.",
        breadcrumbs: [
          { label: "Schemas", to: "/schemas" },
          ...(schemaId ? [{ label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` }] : []),
          { label: "Bookmarks" },
        ],
      }}
      loadingLabel="Loading bookmarks..."
      pageSize={PAGE_SIZE}
      filterLabel="Filter bookmarks"
      filters={FILTERS}
      placeholder="Search bookmarks by name, id, or version"
      query={{
        data: {
          hasNext: (controls.page + 1) * PAGE_SIZE < filtered.length,
          items: pageItems,
          totalItems: filtered.length,
        },
        error: bookmarksQuery.error,
        isFetching: bookmarksQuery.isFetching,
        isLoading: bookmarksQuery.isLoading,
        refetch: bookmarksQuery.refetch,
      }}
      sortLabel="Sort bookmarks"
      sortOptions={SORTS}
      emptyIcon={<Tags size={22} />}
      emptyTitle="No bookmarks yet"
      filteredEmptyTitle="No matching bookmarks"
      emptyDescription="Bookmark a published snapshot to enable runs."
      filteredEmptyDescription="Try another search term or bookmark age."
      renderItem={(bookmark) =>
        schemaId ? (
          <SchemaBookmarkCatalogItem key={bookmark.id} bookmark={bookmark} schemaId={schemaId} />
        ) : null
      }
    />
  );
}

function filterBookmarks(
  bookmarks: SchemaBookmarkDto[],
  search: string,
  filter: BookmarkFilter,
  sort: BookmarkSort,
  latestVersion?: number,
) {
  const query = search.toLowerCase();
  return bookmarks
    .filter((bookmark) => {
      const latest = latestVersion !== undefined && bookmark.version === latestVersion;
      const filterMatch =
        filter === "all" || (filter === "latest" && latest) || (filter === "older" && !latest);
      return (
        filterMatch &&
        `${bookmark.name} ${bookmark.id} v${bookmark.version}`.toLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name);
      if (sort === "version") return right.version - left.version;
      return right.updatedAt.localeCompare(left.updatedAt);
    });
}
