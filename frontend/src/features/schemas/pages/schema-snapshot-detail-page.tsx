/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Copy, Tag } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";
import { AppButton } from "@/shared/ui/AppButton";
import { AppPage } from "@/shared/ui/AppPage";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { AppSurface } from "@/shared/ui/AppSurface";
import { useSchema, useSchemaVersion } from "@/features/schemas/api/schema-queries";
import { BookmarkSnapshotDialog } from "@/features/schemas/components/BookmarkSnapshotDialog";
import { CloneSchemaDialog } from "@/features/schemas/components/CloneSchemaDialog";
import { SchemaSnapshotPreviewPanel } from "@/features/schemas/components/SchemaSnapshotPreviewPanel";
import { useWorkspaceContext } from "@/capabilities/workspace-context/workspace-context";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

export function SchemaSnapshotDetailPage() {
  const { schemaId, versionId } = useParams<{ schemaId: string; versionId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: workspace } = useWorkspaceContext();
  const { data: version } = useSchemaVersion(versionId);
  const [bookmarkTarget, setBookmarkTarget] = useState<SchemaVersionDto | null>(null);
  const [cloneTarget, setCloneTarget] = useState<SchemaVersionDto | null>(null);
  const title = version ? `${version.name} · v${version.version}` : "Snapshot";

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto lg:overflow-hidden">
        <AppPageHeader
          title={title}
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId ? [{ label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` }] : []),
            { label: "Snapshots", to: `/schemas/${schemaId}/snapshots` },
            { label: title },
          ]}
          actions={
            version ? (
              <>
                {workspace?.permissions.canEditModels ? (
                  <AppButton onClick={() => setCloneTarget(version)}>
                    <Copy size={16} />
                    Create schema
                  </AppButton>
                ) : null}
                <AppButton variant="secondary" onClick={() => setBookmarkTarget(version)}>
                  <Tag size={16} />
                  Bookmark
                </AppButton>
              </>
            ) : null
          }
        />
        {version ? <SchemaSnapshotPreviewPanel version={version} /> : null}
      </AppSurface>
      {schemaId ? (
        <>
          <BookmarkSnapshotDialog
            schemaId={schemaId}
            version={bookmarkTarget}
            onClose={() => setBookmarkTarget(null)}
          />
          <CloneSchemaDialog
            schemaId={schemaId}
            schemaName={schema?.name}
            version={cloneTarget}
            onClose={() => setCloneTarget(null)}
          />
        </>
      ) : null}
    </AppPage>
  );
}
