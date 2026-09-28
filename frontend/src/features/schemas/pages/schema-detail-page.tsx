/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { AppEmptyState } from "@/shared/ui/AppEmptyState";
import { AppButton } from "@/shared/ui/AppButton";
import { appButtonClass } from "@/shared/ui/button-styles";
import { AppPage } from "@/shared/ui/AppPage";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPageLoader } from "@/shared/ui/AppPageLoader";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { AppPanel } from "@/shared/ui/AppPanel";
import { AppSectionTitle } from "@/shared/ui/AppSectionTitle";
import { AppSurface } from "@/shared/ui/AppSurface";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { useSchema, useSchemaVersions } from "@/features/schemas/api/schema-queries";
import { latestSchemaVersion } from "@/features/schemas/lib/version-selection";
import { CreateSchemaChangeDialog } from "@/features/schemas/components/CreateSchemaChangeDialog";
import { SchemaRepoNav } from "@/features/schemas/components/SchemaRepoNav";
import { SchemaSnapshotPreviewPanel } from "@/features/schemas/components/SchemaSnapshotPreviewPanel";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

export function SchemaDetailPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const { data: schema, isLoading, isError } = useSchema(schemaId);
  const showLoader = useStableLoading(isLoading);
  const versionsQuery = useSchemaVersions(schemaId);
  const [changeBase, setChangeBase] = useState<SchemaVersionDto | null>(null);
  const latestVersion = useMemo(
    () => latestSchemaVersion(versionsQuery.data ?? []),
    [versionsQuery.data],
  );

  if (showLoader || isError || !schema) {
    if (showLoader) return <AppPageLoader label="Loading schema…" />;
    return (
      <AppPage>
        <AppEmptyState
          title="Schema unavailable"
          description="The schema could not be loaded. It may no longer exist or you may not have access."
          action={
            <Link to="/schemas" className={appButtonClass()}>
              Back to schemas
            </Link>
          }
        />
      </AppPage>
    );
  }

  return (
    <AppPage>
      <AppSurface className="flex flex-1 flex-col gap-6 overflow-auto lg:overflow-hidden">
        <AppPageHeader
          title={schema?.name ?? "Schema"}
          description={schema?.description}
          breadcrumbs={[{ label: "Schemas", to: "/schemas" }, { label: schema?.name ?? "Schema" }]}
          actions={
            schemaId ? (
              <AppButton
                disabled={!latestVersion}
                onClick={() => setChangeBase(latestVersion ?? null)}
              >
                <Plus size={16} />
                New change
              </AppButton>
            ) : null
          }
        />
        {schemaId ? <SchemaRepoNav active="overview" schemaId={schemaId} /> : null}
        {!schemaId ? null : versionsQuery.isLoading ? (
          <AppLoadingState label="Loading latest snapshot…" rows={2} />
        ) : latestVersion ? (
          <SchemaSnapshotPreviewPanel version={latestVersion} />
        ) : (
          <AppPanel className="flex flex-col gap-3">
            <AppSectionTitle>No published snapshots</AppSectionTitle>
            <p className="text-sm text-fg-secondary">
              Create a change and publish it to establish the schema document.
            </p>
          </AppPanel>
        )}
      </AppSurface>
      {schemaId ? (
        <CreateSchemaChangeDialog
          schemaId={schemaId}
          baseVersion={changeBase}
          onClose={() => setChangeBase(null)}
        />
      ) : null}
    </AppPage>
  );
}
