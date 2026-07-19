/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { History, Play } from "lucide-react";
import { Link, useParams } from "react-router";
import { AppButton, AppPage, AppPageHeader, AppSurface } from "@/app/components";
import { useSchema, useSchemaBookmark, useSchemaVersion } from "@/api/schemas/hooks";
import { SchemaSnapshotPreviewPanel } from "@/schemas/components/SchemaSnapshotPreviewPanel";

export function SchemaBookmarkDetailPage() {
  const { schemaId, bookmarkId } = useParams<{ schemaId: string; bookmarkId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: bookmark } = useSchemaBookmark(bookmarkId);
  const { data: version } = useSchemaVersion(bookmark?.versionId);

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title={bookmark?.name ?? "Bookmarked version"}
          description={
            bookmark ? `${bookmark.versionName} · v${bookmark.version}` : "Operational snapshot"
          }
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId ? [{ label: schema?.name ?? "Schema", to: `/schemas/${schemaId}` }] : []),
            { label: bookmark?.name ?? "Bookmark" },
          ]}
          actions={
            schemaId && bookmarkId ? (
              <div className="flex flex-wrap gap-2">
                <Link to={`/schemas/${schemaId}/bookmarks/${bookmarkId}/runs/create`}>
                  <AppButton>
                    <Play size={16} />
                    Run
                  </AppButton>
                </Link>
                <Link to={`/schemas/${schemaId}/bookmarks/${bookmarkId}/runs`}>
                  <AppButton variant="secondary">
                    <History size={16} />
                    Inference history
                  </AppButton>
                </Link>
              </div>
            ) : null
          }
        />
        {version ? <SchemaSnapshotPreviewPanel version={version} /> : null}
      </AppSurface>
    </AppPage>
  );
}
