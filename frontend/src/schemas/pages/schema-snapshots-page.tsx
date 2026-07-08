/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { CatalogResourcePage, useCatalogControls } from "../../app/components";
import type { SchemaVersionDto } from "../../api/schemas/dtos";
import {
  useCreateSchemaBookmarkMutation,
  useSchema,
  useSchemaBookmarks,
  useSchemaDrafts,
  useSchemaVersions,
} from "../../api/schemas/hooks";
import { countVisibleSchemaFields } from "../../algorithms/schema/one-hot-category";
import { schemaVersionId, sortSchemaVersions } from "../../algorithms/schema/version-selection";
import { SchemaBookmarkDialog } from "../components/SchemaBookmarkDialog";
import { SchemaRepoNav } from "../components/SchemaRepoNav";
import { SchemaSnapshotCatalogItem } from "../components/SchemaSnapshotCatalogItem";

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
  const { data: drafts = [] } = useSchemaDrafts(schemaId);
  const { data: bookmarks = [] } = useSchemaBookmarks(schemaId);
  const versionsQuery = useSchemaVersions(schemaId);
  const mutation = useCreateSchemaBookmarkMutation(schemaId ?? "");
  const [bookmarkTarget, setBookmarkTarget] = useState<SchemaVersionDto | null>(null);
  const controls = useCatalogControls<SnapshotFilter, SnapshotSort>({
    initialFilter: "all",
    initialSort: "created",
    resetKey: schemaId,
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

  const createBookmark = async (name: string) => {
    if (!bookmarkTarget) return;
    try {
      await mutation.mutateAsync({ name, versionId: schemaVersionId(bookmarkTarget) });
      setBookmarkTarget(null);
      toast.success("Bookmark saved");
    } catch (error) {
      toast.error("Bookmark save failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <>
      <CatalogResourcePage
        accessFallback={null}
        controls={controls}
        navigation={
          schemaId ? (
            <SchemaRepoNav
              active="snapshots"
              schemaId={schemaId}
              changes={drafts.length}
              bookmarks={bookmarks.length}
              snapshots={sortedVersions.length}
            />
          ) : null
        }
        header={{
          title: "Snapshots",
          description: "Immutable published schema documents.",
          breadcrumbs: [
            { label: "Schemas", to: "/schemas" },
            ...(schemaId ? [{ label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` }] : []),
            { label: "Snapshots" },
          ],
        }}
        loadingLabel="Loading snapshots..."
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
            />
          ) : null
        }
      />
      <SchemaBookmarkDialog
        open={Boolean(bookmarkTarget)}
        defaultName={bookmarkTarget ? bookmarkTarget.name.toLowerCase().replace(/\s+/g, "-") : ""}
        snapshotLabel={
          bookmarkTarget ? `${bookmarkTarget.name} · v${bookmarkTarget.version}` : "Snapshot"
        }
        pending={mutation.isPending}
        onClose={() => setBookmarkTarget(null)}
        onConfirm={(name) => void createBookmark(name)}
      />
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
      if (sort === "name") return left.name.localeCompare(right.name);
      if (sort === "version") return right.version - left.version;
      return right.createdAt.localeCompare(left.createdAt);
    });
}
