import {
  useChangeCatalog,
  useSnapshotCatalog,
} from "@/features/schemas/api/schema-catalog-queries";
/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { GitCompareArrows, Plus } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { AppButton } from "@/shared/ui/AppButton";
import { CatalogResourcePage } from "@/shared/ui/catalog/CatalogResourcePage";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import type { SchemaDraftDto } from "@/features/schemas/api/draft-types";
import { useUpdateSchemaDraftMutation } from "@/features/schemas/api/schema-draft-mutations";
import { useSchema } from "@/features/schemas/api/schema-queries";
import { CreateSchemaChangeDialog } from "@/features/schemas/components/CreateSchemaChangeDialog";
import { SchemaChangeNameDialog } from "@/features/schemas/components/SchemaChangeNameDialog";
import { SchemaChangeCatalogItem } from "@/features/schemas/components/SchemaChangeCatalogItem";
import { SchemaRepoNav } from "@/features/schemas/components/SchemaRepoNav";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type ChangeFilter = "open" | "draft" | "conflict" | "all";
type ChangeSort = "updated" | "name" | "base";

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
  const [changeBase, setChangeBase] = useState<SchemaVersionDto | null>(null);
  const [renameTarget, setRenameTarget] = useState<SchemaDraftDto | null>(null);
  const renameMutation = useUpdateSchemaDraftMutation(renameTarget?.id ?? "");
  const controls = useCatalogControls<ChangeFilter, ChangeSort>({
    filters: FILTERS.map(({ value }) => value),
    initialFilter: "open",
    initialSort: "updated",
    sorts: SORTS.map(({ value }) => value),
  });
  const draftsQuery = useChangeCatalog(schemaId, {
    search: controls.search,
    filter: controls.filter,
    sort: controls.sort,
  });
  const latestQuery = useSnapshotCatalog(schemaId, {
    search: "",
    filter: "latest",
    sort: "version",
  });
  const latestVersion = latestQuery.data?.items[0];

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
    } catch {
      // The dialog shows the mutation error and stays open for a retry.
    }
  };

  return (
    <>
      <CatalogResourcePage
        accessFallback={null}
        controls={controls}
        navigation={schemaId ? <SchemaRepoNav active="changes" schemaId={schemaId} /> : null}
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
              disabled={!latestVersion}
              onClick={() => setChangeBase(latestVersion ?? null)}
            >
              <Plus size={16} />
              New change
            </AppButton>
          ) : null,
        }}
        loadingLabel="Loading changes…"
        filterLabel="Filter changes"
        filters={FILTERS}
        placeholder="Search changes by name, id, or status"
        query={draftsQuery}
        sortLabel="Sort changes"
        sortOptions={SORTS}
        emptyIcon={<GitCompareArrows size={22} />}
        emptyTitle="No changes yet"
        filteredEmptyTitle="No matching changes"
        emptyDescription="Create a change from the latest snapshot."
        filteredEmptyDescription="Try another search term or status."
        renderItem={({ draft, baseSnapshotName }) =>
          schemaId ? (
            <SchemaChangeCatalogItem
              key={draft.id}
              baseSnapshotName={baseSnapshotName ?? undefined}
              draft={draft}
              onRename={setRenameTarget}
              schemaId={schemaId}
            />
          ) : null
        }
      />
      {schemaId ? (
        <CreateSchemaChangeDialog
          schemaId={schemaId}
          baseVersion={changeBase}
          onClose={() => setChangeBase(null)}
        />
      ) : null}
      <SchemaChangeNameDialog
        defaultName={renameTarget?.name ?? ""}
        description={
          renameTarget
            ? `${schema?.name ?? "Schema"} · base v${renameTarget.baseVersion}`
            : "Rename change"
        }
        open={Boolean(renameTarget)}
        error={renameMutation.error?.message}
        pending={renameMutation.isPending}
        submitLabel="Rename"
        title="Rename change"
        onClose={() => {
          renameMutation.reset();
          setRenameTarget(null);
        }}
        onConfirm={(name) => void renameChange(name)}
      />
    </>
  );
}
