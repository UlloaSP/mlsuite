/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AppButton } from "../../app/components/AppButton";
import { AppPage } from "../../app/components/AppPage";
import { AppPanel } from "../../app/components/AppPanel";
import { AppSectionTitle } from "../../app/components/AppSectionTitle";
import { AppSurface } from "../../app/components/AppSurface";
import { AppPageHeader } from "../../app/components/PageHeader";
import {
  useSchema,
  useSchemaBookmarks,
  useCreateSchemaDraftMutation,
  useSchemaDrafts,
  useSchemaVersions,
} from "../../api/schemas/hooks";
import { schemaVersionId, sortSchemaVersions } from "../../algorithms/schema/version-selection";
import { SchemaChangeNameDialog } from "../components/SchemaChangeNameDialog";
import { SchemaRepoNav } from "../components/SchemaRepoNav";
import { SchemaSnapshotPreviewPanel } from "../components/SchemaSnapshotPreviewPanel";

export function SchemaDetailPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const navigate = useNavigate();
  const { data: schema } = useSchema(schemaId);
  const { data: versions = [] } = useSchemaVersions(schemaId);
  const { data: bookmarks = [] } = useSchemaBookmarks(schemaId);
  const { data: drafts = [] } = useSchemaDrafts(schemaId);
  const draftMutation = useCreateSchemaDraftMutation(schemaId ?? "");
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const sortedVersions = useMemo(() => sortSchemaVersions(versions), [versions]);
  const latestVersion = sortedVersions[0];

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

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title={schema?.name ?? "Schema"}
          description={schema?.description}
          breadcrumbs={[{ label: "Schemas", to: "/schemas" }, { label: schema?.name ?? "Schema" }]}
          actions={
            schemaId ? (
              <AppButton
                disabled={!latestVersion || draftMutation.isPending}
                onClick={() => setChangeDialogOpen(true)}
              >
                <Plus size={16} />
                New change
              </AppButton>
            ) : null
          }
        />
        {schemaId ? (
          <div className="flex min-h-0 flex-1 flex-col gap-6">
            <SchemaRepoNav
              active="overview"
              schemaId={schemaId}
              changes={drafts.length}
              bookmarks={bookmarks.length}
              snapshots={versions.length}
            />
            {latestVersion ? (
              <SchemaSnapshotPreviewPanel version={latestVersion} />
            ) : (
              <AppPanel className="flex flex-col gap-3">
                <AppSectionTitle>No published snapshots</AppSectionTitle>
                <p className="text-sm text-[var(--text-secondary)]">
                  Create a change and publish it to establish the schema document.
                </p>
              </AppPanel>
            )}
          </div>
        ) : null}
      </AppSurface>
      <SchemaChangeNameDialog
        defaultName="Update schema"
        description={
          latestVersion
            ? `${latestVersion.name} · v${latestVersion.version}`
            : "Latest published snapshot"
        }
        open={changeDialogOpen}
        pending={draftMutation.isPending}
        submitLabel="Create change"
        title="New change"
        onClose={() => setChangeDialogOpen(false)}
        onConfirm={(name) => void createChange(name)}
      />
    </AppPage>
  );
}
