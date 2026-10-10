import { useBookmarkCatalog } from "@/features/schemas/api/schema-catalog-queries";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Tags } from "lucide-react";
import { useParams } from "react-router";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { useSchema } from "@/features/schemas/api/schema-queries";
import { SchemaBookmarkCatalogItem } from "@/features/schemas/components/SchemaBookmarkCatalogItem";
import { SchemaRepoNav } from "@/features/schemas/components/SchemaRepoNav";

type BookmarkFilter = "all" | "latest" | "older";
type BookmarkSort = "updated" | "name" | "version";

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
  const controls = useCatalogControls<BookmarkFilter, BookmarkSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "updated",
    sorts: SORTS.map(({ value }) => value),
  });
  const bookmarksQuery = useBookmarkCatalog(schemaId, {
    search: controls.search,
    filter: controls.filter,
    sort: controls.sort,
  });

  return (
    <CatalogResourcePage
      accessFallback={null}
      controls={controls}
      navigation={schemaId ? <SchemaRepoNav active="bookmarks" schemaId={schemaId} /> : null}
      header={{
        title: "Bookmarks",
        description: "Operational tags that point to exact published snapshots.",
        breadcrumbs: [
          { label: "Schemas", to: "/schemas" },
          ...(schemaId ? [{ label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` }] : []),
          { label: "Bookmarks" },
        ],
      }}
      loadingLabel="Loading bookmarks…"
      filterLabel="Filter bookmarks"
      filters={FILTERS}
      placeholder="Search bookmarks by name, id, or version"
      query={bookmarksQuery}
      sortLabel="Sort bookmarks"
      sortOptions={SORTS}
      emptyIcon={<Tags size={22} />}
      emptyTitle="No bookmarks yet"
      filteredEmptyTitle="No matching bookmarks"
      emptyDescription="Bookmark a published snapshot to enable runs."
      filteredEmptyDescription="Try another search term or bookmark age."
      renderItem={(bookmark) =>
        schemaId ? <SchemaBookmarkCatalogItem key={bookmark.id} bookmark={bookmark} /> : null
      }
    />
  );
}
