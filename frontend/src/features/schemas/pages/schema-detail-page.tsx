/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
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
import { useCreateSchemaDraftMutation } from "@/features/schemas/api/schema-draft-mutations";
import { schemaVersionId, sortSchemaVersions } from "@/features/schemas/lib/version-selection";
import { SchemaChangeNameDialog } from "@/features/schemas/components/SchemaChangeNameDialog";
import { SchemaRepoNav } from "@/features/schemas/components/SchemaRepoNav";
import { SchemaSnapshotPreviewPanel } from "@/features/schemas/components/SchemaSnapshotPreviewPanel";

export function SchemaDetailPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const navigate = useNavigate();
  const { data: schema, isLoading, isError } = useSchema(schemaId);
  const showLoader = useStableLoading(isLoading);
  const versionsQuery = useSchemaVersions(schemaId);
  const draftMutation = useCreateSchemaDraftMutation(schemaId ?? "");
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const sortedVersions = useMemo(
    () => sortSchemaVersions(versionsQuery.data ?? []),
    [versionsQuery.data],
  );
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
    } catch {
      // The dialog shows the mutation error and stays open for a retry.
    }
  };

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
                disabled={!latestVersion || draftMutation.isPending}
                onClick={() => setChangeDialogOpen(true)}
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
      <SchemaChangeNameDialog
        defaultName="Update schema"
        description={
          latestVersion
            ? `${latestVersion.name} · v${latestVersion.version}`
            : "Latest published snapshot"
        }
        open={changeDialogOpen}
        error={draftMutation.error?.message}
        pending={draftMutation.isPending}
        submitLabel="Create change"
        title="New change"
        onClose={() => {
          draftMutation.reset();
          setChangeDialogOpen(false);
        }}
        onConfirm={(name) => void createChange(name)}
      />
    </AppPage>
  );
}
