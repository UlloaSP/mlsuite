/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { useSchema, useSchemaVersions } from "@/features/schemas/api/schema-queries";
import { countVisibleSchemaFields } from "@/features/schemas/lib/one-hot-category";
import { schemaVersionName, sortSchemaVersions } from "@/features/schemas/lib/version-selection";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { BookmarkSnapshotDialog } from "@/features/schemas/components/BookmarkSnapshotDialog";
import { CloneSchemaDialog } from "@/features/schemas/components/CloneSchemaDialog";
import { CreateSchemaChangeDialog } from "@/features/schemas/components/CreateSchemaChangeDialog";
import { SchemaRepoNav } from "@/features/schemas/components/SchemaRepoNav";
import { SchemaSnapshotCatalogItem } from "@/features/schemas/components/SchemaSnapshotCatalogItem";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type SnapshotFilter = "all" | "latest" | "withBindings";
type SnapshotSort = "created" | "version" | "name";

const PAGE_SIZE = 10;
const FILTERS: Array<{ value: SnapshotFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "latest", label: "Latest" },
  { value: "withBindings", label: "With bindings" },
];
const SORTS: Array<{ value: SnapshotSort; label: string }> = [
  { value: "created", label: "Latest created" },
  { value: "version", label: "Version" },
  { value: "name", label: "Name" },
];

export function SchemaSnapshotsPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: workspace } = useWorkspaceContext();
  const versionsQuery = useSchemaVersions(schemaId);
  const [bookmarkTarget, setBookmarkTarget] = useState<SchemaVersionDto | null>(null);
  const [changeTarget, setChangeTarget] = useState<SchemaVersionDto | null>(null);
  const [cloneTarget, setCloneTarget] = useState<SchemaVersionDto | null>(null);
  const controls = useCatalogControls<SnapshotFilter, SnapshotSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "created",
    resetKey: schemaId,
    sorts: SORTS.map(({ value }) => value),
  });
  const sortedVersions = useMemo(
    () => sortSchemaVersions(versionsQuery.data ?? []),
    [versionsQuery.data],
  );
  const latestVersion = sortedVersions[0]?.version;
  const filtered = useMemo(
    () =>
      filterSnapshots(
        sortedVersions,
        controls.search,
        controls.filter,
        controls.sort,
        latestVersion,
      ),
    [controls.filter, controls.search, controls.sort, latestVersion, sortedVersions],
  );
  const pageItems = filtered.slice(controls.page * PAGE_SIZE, (controls.page + 1) * PAGE_SIZE);

  return (
    <>
      <CatalogResourcePage
        accessFallback={null}
        controls={controls}
        navigation={schemaId ? <SchemaRepoNav active="snapshots" schemaId={schemaId} /> : null}
        header={{
          title: "Snapshots",
          description: "Immutable published schema documents.",
          breadcrumbs: [
            { label: "Schemas", to: "/schemas" },
            ...(schemaId ? [{ label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` }] : []),
            { label: "Snapshots" },
          ],
        }}
        loadingLabel="Loading snapshots…"
        pageSize={PAGE_SIZE}
        filterLabel="Filter snapshots"
        filters={FILTERS}
        placeholder="Search snapshots by name, id, or version"
        query={{
          data: {
            hasNext: (controls.page + 1) * PAGE_SIZE < filtered.length,
            items: pageItems,
            totalItems: filtered.length,
          },
          error: versionsQuery.error,
          isFetching: versionsQuery.isFetching,
          isLoading: versionsQuery.isLoading,
          refetch: versionsQuery.refetch,
        }}
        sortLabel="Sort snapshots"
        sortOptions={SORTS}
        emptyIcon={<GitCommitHorizontal size={22} />}
        emptyTitle="No snapshots yet"
        filteredEmptyTitle="No matching snapshots"
        emptyDescription="Publish a change to create the first immutable snapshot."
        filteredEmptyDescription="Try another search term or snapshot filter."
        renderItem={(version) =>
          schemaId ? (
            <SchemaSnapshotCatalogItem
              key={version.id}
              schemaId={schemaId}
              version={version}
              onBookmark={setBookmarkTarget}
              onClone={workspace?.permissions.canEditModels ? setCloneTarget : undefined}
              onCreateChange={setChangeTarget}
            />
          ) : null
        }
      />
      {schemaId ? (
        <>
          <BookmarkSnapshotDialog
            schemaId={schemaId}
            version={bookmarkTarget}
            onClose={() => setBookmarkTarget(null)}
          />
          <CreateSchemaChangeDialog
            schemaId={schemaId}
            baseVersion={changeTarget}
            onClose={() => setChangeTarget(null)}
          />
          <CloneSchemaDialog
            schemaId={schemaId}
            schemaName={schema?.name}
            version={cloneTarget}
            onClose={() => setCloneTarget(null)}
          />
        </>
      ) : null}
    </>
  );
}

function filterSnapshots(
  versions: SchemaVersionDto[],
  search: string,
  filter: SnapshotFilter,
  sort: SnapshotSort,
  latestVersion?: number,
) {
  const query = search.toLowerCase();
  return versions
    .filter((version) => {
      const latest = latestVersion !== undefined && version.version === latestVersion;
      const filterMatch =
        filter === "all" ||
        (filter === "latest" && latest) ||
        (filter === "withBindings" && version.bindings.length > 0);
      const haystack = `${version.name} ${version.id} v${version.version} ${countVisibleSchemaFields(
        version.formSchema,
      )} fields`;
      return filterMatch && haystack.toLowerCase().includes(query);
    })
    .sort((left, right) => {
      if (sort === "name") return schemaVersionName(left).localeCompare(schemaVersionName(right));
      if (sort === "version") return right.version - left.version;
      return right.createdAt.localeCompare(left.createdAt);
    });
}
