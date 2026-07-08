/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCompareArrows, Plus } from "lucide-react";
import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { AppButton, CatalogResourcePage, useCatalogControls } from "../../app/components";
import type { SchemaDraftDto } from "../../api/schemas/dtos";
import {
  useSchema,
  useSchemaBookmarks,
  useSchemaDrafts,
  useSchemaVersions,
} from "../../api/schemas/hooks";
import { sortSchemaVersions } from "../../algorithms/schema/version-selection";
import { SchemaChangeCatalogItem } from "../components/SchemaChangeCatalogItem";
import { SchemaRepoNav } from "../components/SchemaRepoNav";

const EMPTY_BOOKMARKS: never[] = [];
const EMPTY_DRAFTS: never[] = [];
const EMPTY_VERSIONS: never[] = [];
type ChangeFilter = "open" | "draft" | "conflict" | "all";
type ChangeSort = "updated" | "name" | "base";

const PAGE_SIZE = 10;
const FILTERS: Array<{ value: ChangeFilter; label: string }> = [
  { value: "open", label: "Open" },
  { value: "draft", label: "Draft" },
  { value: "conflict", label: "Conflict" },
  { value: "all", label: "All" },
];
const SORTS: Array<{ value: ChangeSort; label: string }> = [
  { value: "updated", label: "Latest updated" },
  { value: "name", label: "Name" },
  { value: "base", label: "Base version" },
];

export function SchemaChangesPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const { data: schema } = useSchema(schemaId);
  const draftsQuery = useSchemaDrafts(schemaId);
  const { data: bookmarks = EMPTY_BOOKMARKS } = useSchemaBookmarks(schemaId);
  const { data: versions = EMPTY_VERSIONS } = useSchemaVersions(schemaId);
  const controls = useCatalogControls<ChangeFilter, ChangeSort>({
    initialFilter: "open",
    initialSort: "updated",
    resetKey: schemaId,
  });
  const drafts = draftsQuery.data ?? EMPTY_DRAFTS;
  const sortedVersions = useMemo(() => sortSchemaVersions(versions), [versions]);
  const filtered = useMemo(
    () => filterChanges(drafts, controls.search, controls.filter, controls.sort),
    [controls.filter, controls.search, controls.sort, drafts],
  );
  const pageItems = filtered.slice(controls.page * PAGE_SIZE, (controls.page + 1) * PAGE_SIZE);

  return (
    <CatalogResourcePage
      accessFallback={null}
      controls={controls}
      navigation={
        schemaId ? (
          <SchemaRepoNav
            active="changes"
            schemaId={schemaId}
            changes={drafts.length}
            bookmarks={bookmarks.length}
            snapshots={sortedVersions.length}
          />
        ) : null
      }
      header={{
        title: "Changes",
        description: "Mutable unpublished work based on a published snapshot.",
        breadcrumbs: [
          { label: "Schemas", to: "/schemas" },
          ...(schemaId ? [{ label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` }] : []),
          { label: "Changes" },
        ],
        actions: schemaId ? (
          <Link to={`/schemas/${schemaId}/drafts/create`}>
            <AppButton>
              <Plus size={16} />
              New change
            </AppButton>
          </Link>
        ) : null,
      }}
      loadingLabel="Loading changes..."
      pageSize={PAGE_SIZE}
      filterLabel="Filter changes"
      filters={FILTERS}
      placeholder="Search changes by name, id, or status"
      query={{
        data: {
          hasNext: (controls.page + 1) * PAGE_SIZE < filtered.length,
          items: pageItems,
          totalItems: filtered.length,
        },
        error: draftsQuery.error,
        isFetching: draftsQuery.isFetching,
        isLoading: draftsQuery.isLoading,
        refetch: draftsQuery.refetch,
      }}
      sortLabel="Sort changes"
      sortOptions={SORTS}
      emptyIcon={<GitCompareArrows size={22} />}
      emptyTitle="No changes yet"
      filteredEmptyTitle="No matching changes"
      emptyDescription="Create a change from the latest snapshot."
      filteredEmptyDescription="Try another search term or status."
      renderItem={(draft) =>
        schemaId ? (
          <SchemaChangeCatalogItem key={draft.id} draft={draft} schemaId={schemaId} />
        ) : null
      }
    />
  );
}

function filterChanges(
  drafts: SchemaDraftDto[],
  search: string,
  filter: ChangeFilter,
  sort: ChangeSort,
) {
  const query = search.toLowerCase();
  return drafts
    .filter((draft) => {
      const open = draft.status !== "PUBLISHED";
      const statusMatch =
        filter === "all" ||
        (filter === "open" && open) ||
        (filter === "draft" && draft.status === "DRAFT") ||
        (filter === "conflict" && draft.status === "CONFLICT");
      return (
        statusMatch && `${draft.name} ${draft.id} ${draft.status}`.toLowerCase().includes(query)
      );
    })
    .sort((left, right) => {
      if (sort === "name") return left.name.localeCompare(right.name);
      if (sort === "base") return right.baseVersion - left.baseVersion;
      return right.updatedAt.localeCompare(left.updatedAt);
    });
}
