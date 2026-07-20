/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy, Tag } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AppButton } from "@/app/components/AppButton";
import { AppPage } from "@/app/components/AppPage";
import { AppPageHeader } from "@/app/components/PageHeader";
import { AppSurface } from "@/app/components/AppSurface";
import {
  useCreateSchemaBookmarkMutation,
  useDuplicateSchemaMutation,
  useSchema,
  useSchemaVersion,
} from "@/api/schemas/hooks";
import { SchemaBookmarkDialog } from "@/schemas/components/SchemaBookmarkDialog";
import { SchemaChangeNameDialog } from "@/schemas/components/SchemaChangeNameDialog";
import { SchemaSnapshotPreviewPanel } from "@/schemas/components/SchemaSnapshotPreviewPanel";
import { useWorkspaceContext } from "@/api/workspace/hooks";

export function SchemaSnapshotDetailPage() {
  const { schemaId, versionId } = useParams<{ schemaId: string; versionId: string }>();
  const navigate = useNavigate();
  const { data: schema } = useSchema(schemaId);
  const { data: workspace } = useWorkspaceContext();
  const { data: version } = useSchemaVersion(versionId);
  const mutation = useCreateSchemaBookmarkMutation(schemaId ?? "");
  const duplicateMutation = useDuplicateSchemaMutation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cloneDialogOpen, setCloneDialogOpen] = useState(false);

  const createBookmark = async (name: string) => {
    if (!version) return;
    try {
      await mutation.mutateAsync({ name, versionId: version.id });
      setDialogOpen(false);
      toast.success("Bookmark saved");
    } catch (error) {
      toast.error("Bookmark save failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const cloneSchema = async (name: string) => {
    if (!schemaId || !version) return;
    try {
      const copy = await duplicateMutation.mutateAsync({
        id: schemaId,
        name,
        versionId: version.id,
      });
      setCloneDialogOpen(false);
      toast.success("Schema created from snapshot");
      void navigate(`/schemas/${copy.id}`);
    } catch (error) {
      toast.error("Schema creation failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title={version ? `${version.name} · v${version.version}` : "Snapshot"}
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId ? [{ label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` }] : []),
            { label: "Snapshot" },
          ]}
          actions={
            version ? (
              <div className="flex items-center gap-2">
                <AppButton variant="secondary" onClick={() => setDialogOpen(true)}>
                  <Tag size={16} />
                  Bookmark
                </AppButton>
                {workspace?.permissions.canEditModels ? (
                  <AppButton onClick={() => setCloneDialogOpen(true)}>
                    <Copy size={16} />
                    Create schema
                  </AppButton>
                ) : null}
              </div>
            ) : null
          }
        />
        {version ? <SchemaSnapshotPreviewPanel version={version} /> : null}
      </AppSurface>
      <SchemaBookmarkDialog
        open={dialogOpen}
        defaultName={version ? version.name.toLowerCase().replace(/\s+/g, "-") : "production"}
        snapshotLabel={version ? `${version.name} · v${version.version}` : "Snapshot"}
        pending={mutation.isPending}
        onClose={() => setDialogOpen(false)}
        onConfirm={(name) => void createBookmark(name)}
      />
      <SchemaChangeNameDialog
        defaultName={`${schema?.name ?? "Schema"} Copy`}
        description={
          version
            ? `Create an independent schema with ${version.name} · v${version.version} as its first snapshot.`
            : "Selected snapshot"
        }
        fieldLabel="Schema name"
        open={cloneDialogOpen}
        pending={duplicateMutation.isPending}
        placeholder="New schema"
        submitIcon="copy"
        submitLabel="Create schema"
        title="Create schema from snapshot"
        onClose={() => setCloneDialogOpen(false)}
        onConfirm={(name) => void cloneSchema(name)}
      />
    </AppPage>
  );
}
