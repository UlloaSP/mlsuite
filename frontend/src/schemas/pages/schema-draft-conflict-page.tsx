/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CheckCircle2, PencilLine, RefreshCcw } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  AppBadge,
  AppButton,
  AppCopy,
  AppPage,
  AppPageHeader,
  AppPanel,
  AppSectionTitle,
  AppSurface,
} from "../../app/components";
import {
  usePublishSchemaDraftMutation,
  useSchema,
  useSchemaDraft,
  useSchemaDraftDiff,
  useSchemaVersion,
} from "../../api/schemas/hooks";
import { SchemaMergeDiffViewer } from "../components/SchemaMergeDiffViewer";

export function SchemaDraftConflictPage() {
  const { schemaId, draftId } = useParams<{ schemaId: string; draftId: string }>();
  const navigate = useNavigate();
  const { data: schemaDto } = useSchema(schemaId);
  const { data: draft } = useSchemaDraft(draftId);
  const { data: diff } = useSchemaDraftDiff(draftId);
  const { data: currentVersion } = useSchemaVersion(diff?.currentVersionId);
  const publishMutation = usePublishSchemaDraftMutation(draftId ?? "", schemaId ?? "");

  const publish = async () => {
    if (!schemaId) return;
    try {
      const result = await publishMutation.mutateAsync();
      if (result.status === "published" && result.version) {
        void navigate(`/schemas/${schemaId}/versions/${result.version.id}`);
        return;
      }
      toast.error("Publish needs merge review", {
        description: "Current snapshot changed since this change was created.",
      });
    } catch (error) {
      toast.error("Publish failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <AppPage>
      <AppSurface className="flex-1 space-y-5 overflow-auto">
        <AppPageHeader
          title="Review changes"
          description={draft ? `${draft.name} · base v${draft.baseVersion}` : undefined}
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId
              ? [{ label: schemaDto?.name ?? "Schema", to: `/schemas/${schemaId}` }]
              : []),
            { label: "Review" },
          ]}
          actions={
            <div className="flex flex-wrap gap-2">
              {schemaId && draftId ? (
                <Link to={`/schemas/${schemaId}/drafts/${draftId}`}>
                  <AppButton variant="secondary">
                    <PencilLine size={16} />
                    Manual edit
                  </AppButton>
                </Link>
              ) : null}
              <AppButton
                disabled={!draft || publishMutation.isPending || Boolean(diff?.hasConflicts)}
                onClick={publish}
              >
                {publishMutation.isPending ? (
                  <RefreshCcw className="animate-spin" size={16} />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                Publish snapshot
              </AppButton>
            </div>
          }
        />
        <AppPanel className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <AppSectionTitle>Current vs incoming</AppSectionTitle>
              <AppCopy>Review the full diff before publishing this change as a snapshot.</AppCopy>
            </div>
            <div className="flex flex-wrap gap-2">
              <AppBadge tone="neutral">current v{currentVersion?.version ?? "-"}</AppBadge>
              <AppBadge tone={diff?.hasConflicts ? "danger" : "success"}>
                {diff?.hasConflicts ? "merge needed" : "ready"}
              </AppBadge>
            </div>
          </div>
          {currentVersion && draft ? (
            <SchemaMergeDiffViewer
              currentSchema={currentVersion.formSchema}
              incomingSchema={draft.formSchema}
            />
          ) : (
            <AppCopy>Loading diff.</AppCopy>
          )}
        </AppPanel>
      </AppSurface>
    </AppPage>
  );
}
