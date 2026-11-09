import {
  useBookmarkCatalog,
  useSnapshotCatalog,
} from "@/features/schemas/api/schema-catalog-queries";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Tag, Tags } from "lucide-react";
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { useSchema } from "@/features/schemas/api/schema-queries";
import { BookmarkSnapshotDialog } from "@/features/schemas/components/BookmarkSnapshotDialog";
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

const route = getRouteApi("/protected/app/can-view-models/schemas/$schemaId/bookmarks");
const LATEST_SNAPSHOT = { search: "", filter: "latest", sort: "version" };

export function SchemaBookmarksPage() {
  const { schemaId } = route.useParams();
  const { data: schema } = useSchema(schemaId);
  const controls = useCatalogControls(route.useSearch());
  const bookmarksQuery = useBookmarkCatalog(schemaId, {
    search: controls.search,
    filter: controls.filter,
    sort: controls.sort,
  });
  // An empty tab offers to bookmark the newest snapshot, when the schema has one.
  const latest = useSnapshotCatalog(schemaId, LATEST_SNAPSHOT).data?.items[0];
  const [bookmarking, setBookmarking] = useState(false);

  return (
    <>
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
        emptyDescription={
          latest
            ? "Bookmark a published snapshot to enable runs."
            : "Publish a change to create a snapshot, then bookmark it to enable runs."
        }
        emptyAction={
          latest ? (
            <AppButton onClick={() => setBookmarking(true)}>
              <Tag size={16} />
              Bookmark latest snapshot
            </AppButton>
          ) : undefined
        }
        filteredEmptyDescription="Try another search term or bookmark age."
        renderItem={(bookmark) =>
          schemaId ? <SchemaBookmarkCatalogItem key={bookmark.id} bookmark={bookmark} /> : null
        }
      />
      {schemaId ? (
        <BookmarkSnapshotDialog
          schemaId={schemaId}
          version={bookmarking ? (latest ?? null) : null}
          onClose={() => setBookmarking(false)}
        />
      ) : null}
    </>
  );
}
