import { getRouteApi } from "@tanstack/react-router";
import { usePredictCatalog } from "@/features/schemas/api/schema-catalog-queries";
import { useSchemaCatalogPageQuery } from "@/features/schemas/api/schema-queries";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Play } from "lucide-react";
import { AppLink } from "@/shared/ui/AppLink";
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

const route = getRouteApi("/protected/app/can-view-models/predict");

/** Every bookmark of the organization, ready to run: one click opens its workspace. */
export function PredictPage() {
  const controls = useCatalogControls(route.useSearch());
  const query = usePredictCatalog({
    search: controls.search,
    filter: controls.filter,
    sort: controls.sort,
  });
  const SchemasIcon = SECTION_ICONS.schemas;
  // With nothing to run, the way on is a schema's snapshots, or the schemas when there are none.
  const schemas = useSchemaCatalogPageQuery(useCurrentOrganizationId(), "", "updated", "active");
  const firstSchema = schemas.data?.items[0];

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
        firstSchema ? (
          <AppLink
            to="/schemas/$schemaId/snapshots"
            params={{ schemaId: String(firstSchema.id) }}
            className={appButtonClass()}
          >
            <SchemasIcon size={16} />
            Open {firstSchema.name} snapshots
          </AppLink>
        ) : (
          <AppLink to="/schemas" className={appButtonClass()}>
            <SchemasIcon size={16} />
            Open schemas
          </AppLink>
        )
      }
      filteredEmptyDescription="Try another search or show every bookmark."
      renderItem={(bookmark) => <PredictBookmarkCard key={bookmark.id} bookmark={bookmark} />}
    />
  );
}
