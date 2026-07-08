/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { AppButton, AppPage, AppPageHeader, AppSurface } from "../../app/components";
import {
  useCreateSchemaBookmarkMutation,
  useSchema,
  useSchemaBookmarks,
  useSchemaDrafts,
  useSchemaVersions,
} from "../../api/schemas/hooks";
import type { SchemaVersionDto } from "../../api/schemas/dtos";
import { schemaVersionId, sortSchemaVersions } from "../../algorithms/schema/version-selection";
import { LatestSnapshotOverview } from "../components/LatestSnapshotOverview";
import { SchemaBookmarkDialog } from "../components/SchemaBookmarkDialog";
import { SchemaRepoNav } from "../components/SchemaRepoNav";
import { SchemaSnapshotPreviewPanel } from "../components/SchemaSnapshotPreviewPanel";

export function SchemaDetailPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const { data: schema } = useSchema(schemaId);
  const { data: versions = [] } = useSchemaVersions(schemaId);
  const { data: bookmarks = [] } = useSchemaBookmarks(schemaId);
  const { data: drafts = [] } = useSchemaDrafts(schemaId);
  const bookmarkMutation = useCreateSchemaBookmarkMutation(schemaId ?? "");
  const [bookmarkTarget, setBookmarkTarget] = useState<SchemaVersionDto | null>(null);
  const sortedVersions = useMemo(() => sortSchemaVersions(versions), [versions]);
  const latestVersion = sortedVersions[0];

  const createBookmark = async (name: string) => {
    if (!schemaId || !bookmarkTarget) return;
    try {
      await bookmarkMutation.mutateAsync({
        name,
        versionId: schemaVersionId(bookmarkTarget),
      });
      setBookmarkTarget(null);
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
          title={schema?.name ?? "Schema"}
          breadcrumbs={[{ label: "Schemas", to: "/schemas" }, { label: schema?.name ?? "Schema" }]}
          actions={
            schemaId ? (
              <Link to={`/schemas/${encodeURIComponent(schemaId)}/drafts/create`}>
                <AppButton>
                  <Plus size={16} />
                  New change
                </AppButton>
              </Link>
            ) : null
          }
        />
        {schemaId ? (
          <>
            <SchemaRepoNav
              active="overview"
              schemaId={schemaId}
              changes={drafts.length}
              bookmarks={bookmarks.length}
              snapshots={versions.length}
            />
            <LatestSnapshotOverview
              schemaId={schemaId}
              version={latestVersion}
              onBookmark={setBookmarkTarget}
            />
            {latestVersion ? <SchemaSnapshotPreviewPanel version={latestVersion} /> : null}
          </>
        ) : null}
      </AppSurface>
      <SchemaBookmarkDialog
        open={Boolean(bookmarkTarget)}
        defaultName={bookmarkTarget ? defaultBookmarkName(bookmarkTarget) : ""}
        snapshotLabel={
          bookmarkTarget ? `${bookmarkTarget.name} · v${bookmarkTarget.version}` : "Snapshot"
        }
        pending={bookmarkMutation.isPending}
        onClose={() => setBookmarkTarget(null)}
        onConfirm={(name) => void createBookmark(name)}
      />
    </AppPage>
  );
}

function defaultBookmarkName(version: SchemaVersionDto) {
  return version.name ? version.name.toLowerCase().replace(/\s+/g, "-") : "production";
}
