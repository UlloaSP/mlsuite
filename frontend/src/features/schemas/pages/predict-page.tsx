/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Play } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";
import { useOrganizationBookmarks } from "@/features/schemas/api/schema-queries";
import { PredictBookmarkCard } from "@/features/schemas/components/PredictBookmarkCard";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { SECTION_ICONS } from "@/shared/ui/section-icons";
import type { PredictBookmarkDto } from "@/shared/api/openapi.gen";

type LauncherFilter = "all" | "behind";
type LauncherSort = "schema" | "name" | "used" | "recent";

const EMPTY_BOOKMARKS: PredictBookmarkDto[] = [];
const PAGE_SIZE = 18;
const FILTERS: Array<{ value: LauncherFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "behind", label: "Update available" },
];
const SORTS: Array<{ value: LauncherSort; label: string }> = [
  { value: "schema", label: "Schema" },
  { value: "name", label: "Bookmark name" },
  { value: "used", label: "Most inferences" },
  { value: "recent", label: "Recently run" },
];

/** Every bookmark of the organization, ready to run: one click opens its workspace. */
export function PredictPage() {
  const query = useOrganizationBookmarks();
  const controls = useCatalogControls<LauncherFilter, LauncherSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "schema",
    sorts: SORTS.map(({ value }) => value),
  });
  const bookmarks = query.data ?? EMPTY_BOOKMARKS;
  const filtered = useMemo(
    () => sortBookmarks(matchBookmarks(bookmarks, controls.search, controls.filter), controls.sort),
    [bookmarks, controls.filter, controls.search, controls.sort],
  );
  const pageItems = filtered.slice(controls.page * PAGE_SIZE, (controls.page + 1) * PAGE_SIZE);
  const SchemasIcon = SECTION_ICONS.schemas;

  return (
    <CatalogResourcePage
      accessFallback={null}
      controls={controls}
      header={{
        title: "Predict",
        description: "Pick a bookmark to run its form and review its inferences.",
        breadcrumbs: [{ label: "Predict" }],
      }}
      layout="grid"
      loadingLabel="Loading bookmarks…"
      pageSize={PAGE_SIZE}
      filterLabel="Filter bookmarks"
      filters={FILTERS}
      placeholder="Search by bookmark, schema, model, or version"
      query={{
        data: {
          hasNext: (controls.page + 1) * PAGE_SIZE < filtered.length,
          items: pageItems,
          totalItems: filtered.length,
        },
        error: query.error,
        isFetching: query.isFetching,
        isLoading: query.isLoading,
        refetch: query.refetch,
      }}
      sortLabel="Sort bookmarks"
      sortOptions={SORTS}
      emptyIcon={<Play size={22} />}
      emptyTitle="Nothing to run yet"
      filteredEmptyTitle="No matching bookmarks"
      emptyDescription="Bookmark a published snapshot of a schema to run it from here."
      emptyAction={
        <Link to="/schemas" className={appButtonClass()}>
          <SchemasIcon size={16} />
          Open schemas
        </Link>
      }
      filteredEmptyDescription="Try another search or show every bookmark."
      renderItem={(bookmark) => <PredictBookmarkCard key={bookmark.id} bookmark={bookmark} />}
    />
  );
}

function matchBookmarks(bookmarks: PredictBookmarkDto[], search: string, filter: LauncherFilter) {
  const query = search.toLowerCase();
  return bookmarks.filter(
    (bookmark) =>
      (filter === "all" || bookmark.latestVersion > bookmark.version) &&
      [
        bookmark.name,
        bookmark.schemaName,
        bookmark.versionName,
        `v${bookmark.version}`,
        ...bookmark.models,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query),
  );
}

function sortBookmarks(bookmarks: PredictBookmarkDto[], sort: LauncherSort) {
  return [...bookmarks].sort((left, right) => {
    if (sort === "used") return right.runCount - left.runCount;
    if (sort === "recent") return (right.lastRunAt ?? "").localeCompare(left.lastRunAt ?? "");
    if (sort === "name") return left.name.localeCompare(right.name);
    return left.schemaName.localeCompare(right.schemaName) || left.name.localeCompare(right.name);
  });
}
