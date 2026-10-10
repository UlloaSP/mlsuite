import { useSnapshotCatalog } from "@/features/schemas/api/schema-catalog-queries";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCommitHorizontal } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { useSchema } from "@/features/schemas/api/schema-queries";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import { BookmarkSnapshotDialog } from "@/features/schemas/components/BookmarkSnapshotDialog";
import { CloneSchemaDialog } from "@/features/schemas/components/CloneSchemaDialog";
import { CreateSchemaChangeDialog } from "@/features/schemas/components/CreateSchemaChangeDialog";
import { SchemaRepoNav } from "@/features/schemas/components/SchemaRepoNav";
import { SchemaSnapshotCatalogItem } from "@/features/schemas/components/SchemaSnapshotCatalogItem";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type SnapshotFilter = "all" | "latest" | "withBindings";
type SnapshotSort = "created" | "version" | "name";

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
  const [bookmarkTarget, setBookmarkTarget] = useState<SchemaVersionDto | null>(null);
  const [changeTarget, setChangeTarget] = useState<SchemaVersionDto | null>(null);
  const [cloneTarget, setCloneTarget] = useState<SchemaVersionDto | null>(null);
  const controls = useCatalogControls<SnapshotFilter, SnapshotSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "all",
    initialSort: "created",
    sorts: SORTS.map(({ value }) => value),
  });
  const versionsQuery = useSnapshotCatalog(schemaId, {
    search: controls.search,
    filter: controls.filter,
    sort: controls.sort,
  });

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
        filterLabel="Filter snapshots"
        filters={FILTERS}
        placeholder="Search snapshots by name, id, or version"
        query={versionsQuery}
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
