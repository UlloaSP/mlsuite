import { usePredictCatalog } from "@/features/schemas/api/schema-catalog-queries";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Play } from "lucide-react";
import { Link } from "react-router";
import { PredictBookmarkCard } from "@/features/schemas/components/PredictBookmarkCard";
import { appButtonClass } from "@/shared/ui/button-styles";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { SECTION_ICONS } from "@/shared/ui/section-icons";

type LauncherFilter = "all" | "behind";
type LauncherSort = "schema" | "name" | "used" | "recent";

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
  const controls = useCatalogControls<LauncherFilter, LauncherSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "schema",
    sorts: SORTS.map(({ value }) => value),
  });
  const query = usePredictCatalog({
    search: controls.search,
    filter: controls.filter,
    sort: controls.sort,
  });
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
      filterLabel="Filter bookmarks"
      filters={FILTERS}
      placeholder="Search by bookmark, schema, model, or version"
      query={query}
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
