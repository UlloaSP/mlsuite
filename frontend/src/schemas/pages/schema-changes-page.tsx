/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCompareArrows, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AppButton, CatalogResourcePage, useCatalogControls } from "@/app/components";
import type { SchemaDraftDto } from "@/api/schemas/dtos";
import {
  useSchema,
  useSchemaBookmarks,
  useCreateSchemaDraftMutation,
  useSchemaDrafts,
  useUpdateSchemaDraftMutation,
  useSchemaVersions,
} from "@/api/schemas/hooks";
import { schemaVersionId, sortSchemaVersions } from "@/algorithms/schema/version-selection";
import { SchemaChangeNameDialog } from "@/schemas/components/SchemaChangeNameDialog";
import { SchemaChangeCatalogItem } from "@/schemas/components/SchemaChangeCatalogItem";
import { SchemaRepoNav } from "@/schemas/components/SchemaRepoNav";

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
  const navigate = useNavigate();
  const { data: schema } = useSchema(schemaId);
  const draftsQuery = useSchemaDrafts(schemaId);
  const { data: bookmarks = EMPTY_BOOKMARKS } = useSchemaBookmarks(schemaId);
  const { data: versions = EMPTY_VERSIONS } = useSchemaVersions(schemaId);
  const draftMutation = useCreateSchemaDraftMutation(schemaId ?? "");
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<SchemaDraftDto | null>(null);
  const renameMutation = useUpdateSchemaDraftMutation(renameTarget?.id ?? "");
  const controls = useCatalogControls<ChangeFilter, ChangeSort>({
    initialFilter: "open",
    initialSort: "updated",
    resetKey: schemaId,
  });
  const drafts = draftsQuery.data ?? EMPTY_DRAFTS;
  const sortedVersions = useMemo(() => sortSchemaVersions(versions), [versions]);
  const latestVersion = sortedVersions[0];
  const filtered = useMemo(
    () => filterChanges(drafts, controls.search, controls.filter, controls.sort),
    [controls.filter, controls.search, controls.sort, drafts],
  );
  const pageItems = filtered.slice(controls.page * PAGE_SIZE, (controls.page + 1) * PAGE_SIZE);

  const createChange = async (name: string) => {
    if (!schemaId || !latestVersion) return;
    try {
      const draft = await draftMutation.mutateAsync({
        name,
        baseVersionId: schemaVersionId(latestVersion),
      });
      setChangeDialogOpen(false);
      void navigate(`/schemas/${schemaId}/drafts/${draft.id}`);
    } catch (error) {
      toast.error("Schema change creation failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const renameChange = async (name: string) => {
    if (!renameTarget) return;
    try {
      await renameMutation.mutateAsync({
        expectedDraftRevision: renameTarget.revision,
        name,
        formSchema: renameTarget.formSchema,
        bindings: renameTarget.bindings,
      });
      setRenameTarget(null);
      toast.success("Change renamed");
    } catch (error) {
      toast.error("Change rename failed", {
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
            <AppButton
              disabled={!latestVersion || draftMutation.isPending}
              onClick={() => setChangeDialogOpen(true)}
            >
              <Plus size={16} />
              New change
            </AppButton>
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
            <SchemaChangeCatalogItem
              key={draft.id}
              baseSnapshotName={
                versions.find((version) => schemaVersionId(version) === draft.baseVersionId)?.name
              }
              draft={draft}
              onRename={setRenameTarget}
              schemaId={schemaId}
            />
          ) : null
        }
      />
      <SchemaChangeNameDialog
        defaultName="Update schema"
        description={
          latestVersion ? `${latestVersion.name} · v${latestVersion.version}` : "Latest snapshot"
        }
        open={changeDialogOpen}
        pending={draftMutation.isPending}
        submitLabel="Create change"
        title="New change"
        onClose={() => setChangeDialogOpen(false)}
        onConfirm={(name) => void createChange(name)}
      />
      <SchemaChangeNameDialog
        defaultName={renameTarget?.name ?? ""}
        description={
          renameTarget
            ? `${schema?.name ?? "Schema"} · base v${renameTarget.baseVersion}`
            : "Rename change"
        }
        open={Boolean(renameTarget)}
        pending={renameMutation.isPending}
        submitLabel="Rename"
        title="Rename change"
        onClose={() => setRenameTarget(null)}
        onConfirm={(name) => void renameChange(name)}
      />
    </>
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
