/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Tag } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { AppButton, AppPage, AppPageHeader, AppSurface } from "../../app/components";
import {
  useCreateSchemaBookmarkMutation,
  useSchema,
  useSchemaVersion,
} from "../../api/schemas/hooks";
import { SchemaBookmarkDialog } from "../components/SchemaBookmarkDialog";
import { SchemaSnapshotPreviewPanel } from "../components/SchemaSnapshotPreviewPanel";

export function SchemaSnapshotDetailPage() {
  const { schemaId, versionId } = useParams<{ schemaId: string; versionId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: version } = useSchemaVersion(versionId);
  const mutation = useCreateSchemaBookmarkMutation(schemaId ?? "");
  const [dialogOpen, setDialogOpen] = useState(false);

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

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-6 overflow-auto">
        <AppPageHeader
          title={version ? `${version.name} · v${version.version}` : "Snapshot"}
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId ? [{ label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` }] : []),
            { label: "Snapshot" },
          ]}
          actions={
            version ? (
              <AppButton onClick={() => setDialogOpen(true)}>
                <Tag size={16} />
                Bookmark
              </AppButton>
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
    </AppPage>
  );
}
