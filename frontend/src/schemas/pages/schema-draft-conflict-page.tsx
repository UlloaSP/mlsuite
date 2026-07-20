/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { CheckCircle2, GitMerge, PencilLine, RefreshCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { AppButton } from "@/app/components/AppButton";
import { AppCopy } from "@/app/components/AppCopy";
import { AppPage } from "@/app/components/AppPage";
import { AppPageHeader } from "@/app/components/PageHeader";
import { AppSurface } from "@/app/components/AppSurface";
import { isHttpError } from "@/shared/api/http";
import type {
  SchemaDraftBindingDto,
  SchemaDraftChangeDto,
  SchemaDraftMergeSide,
  SchemaModelBindingDto,
} from "@/api/schemas/dtos";
import {
  useMergeSchemaDraftMutation,
  usePublishSchemaDraftMutation,
  useSchema,
  useSchemaDraft,
  useSchemaDraftDiff,
  useSchemaVersion,
} from "@/api/schemas/hooks";
import { SchemaMergeDiffViewer } from "@/schemas/components/SchemaMergeDiffViewer";

export function SchemaDraftConflictPage() {
  const { schemaId, draftId } = useParams<{ schemaId: string; draftId: string }>();
  const navigate = useNavigate();
  const { data: schemaDto } = useSchema(schemaId);
  const draftQuery = useSchemaDraft(draftId);
  const draft = draftQuery.data;
  const diffQuery = useSchemaDraftDiff(draftId);
  const diff = diffQuery.data;
  const { data: currentVersion } = useSchemaVersion(diff?.currentVersionId);
  const mergeMutation = useMergeSchemaDraftMutation(draftId ?? "", schemaId ?? "");
  const publishMutation = usePublishSchemaDraftMutation(draftId ?? "", schemaId ?? "");
  const [resolutions, setResolutions] = useState<Record<string, SchemaDraftMergeSide | undefined>>(
    {},
  );
  const staleBase = Boolean(draft && diff && draft.baseVersionId !== diff.currentVersionId);
  const needsMerge = Boolean(diff?.hasConflicts || staleBase);
  const currentLabel = currentVersion
    ? `snapshot/${toCodeLabel(currentVersion.name)}@v${currentVersion.version}`
    : "snapshot/latest";
  const incomingLabel = draft ? `change/${toCodeLabel(draft.name)}` : "change/incoming";
  const currentDocument = useMemo(
    () =>
      currentVersion
        ? {
            formSchema: currentVersion.formSchema,
            bindings: normalizeBindings(currentVersion.bindings),
          }
        : undefined,
    [currentVersion],
  );
  const incomingDocument = useMemo(
    () =>
      draft
        ? { formSchema: draft.formSchema, bindings: normalizeBindings(draft.bindings) }
        : undefined,
    [draft],
  );
  const unresolved = useMemo(() => {
    if (!diff || !needsMerge) return 0;
    return diff.changes.filter((change) => change.conflict && !resolutions[change.path]).length;
  }, [diff, needsMerge, resolutions]);

  useEffect(() => {
    if (!diff) return;
    setResolutions(
      Object.fromEntries(
        diff.changes
          .filter((change) => change.conflict)
          .map((change) => [change.path, needsMerge ? undefined : defaultSide(change)]),
      ),
    );
  }, [diff, needsMerge]);

  const publish = async () => {
    if (!schemaId || !draft) return;
    try {
      const result = await publishMutation.mutateAsync(draft.revision);
      if (result.status === "published" && result.version) {
        void navigate(`/schemas/${schemaId}/versions/${result.version.id}`);
        return;
      }
      toast.error("Publish needs merge review", {
        description: "Current snapshot changed since this change was created.",
      });
    } catch (error) {
      if (isHttpError(error) && error.status === 409) {
        await Promise.all([draftQuery.refetch(), diffQuery.refetch()]);
        toast.error("Change updated elsewhere", {
          description: "Review refreshed. Check the latest change before publishing.",
        });
        return;
      }
      toast.error("Publish failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const applyMerge = async () => {
    if (!diff || !draft) return;
    try {
      await mergeMutation.mutateAsync({
        expectedCurrentVersionId: diff.currentVersionId,
        expectedCurrentDocumentHash: diff.currentDocumentHash,
        expectedDraftRevision: draft.revision,
        resolutions: diff.changes
          .filter((change) => change.conflict)
          .map((change) => ({
            path: change.path,
            side: resolutions[change.path] ?? defaultSide(change),
          })),
      });
      toast.success("Merge applied");
    } catch (error) {
      if (isHttpError(error) && error.status === 409) {
        await Promise.all([draftQuery.refetch(), diffQuery.refetch()]);
        toast.error("Merge inputs changed", {
          description: "Review refreshed. Resolve against the latest snapshot and change.",
        });
        return;
      }
      toast.error("Merge failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const setResolution = (paths: string[], side: SchemaDraftMergeSide) => {
    setResolutions((current) => ({
      ...current,
      ...Object.fromEntries(paths.map((path) => [path, side])),
    }));
  };

  return (
    <AppPage>
      <AppSurface className="flex min-w-0 flex-1 flex-col gap-5 overflow-hidden">
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
              {needsMerge ? (
                <AppButton
                  disabled={!draft || !diff || mergeMutation.isPending || unresolved > 0}
                  onClick={applyMerge}
                >
                  {mergeMutation.isPending ? (
                    <RefreshCcw className="animate-spin" size={16} />
                  ) : (
                    <GitMerge size={16} />
                  )}
                  {unresolved > 0 ? `Resolve ${unresolved} paths` : "Apply merge"}
                </AppButton>
              ) : (
                <AppButton disabled={!draft || publishMutation.isPending} onClick={publish}>
                  {publishMutation.isPending ? (
                    <RefreshCcw className="animate-spin" size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  Publish snapshot
                </AppButton>
              )}
            </div>
          }
        />
        {currentVersion && draft ? (
          <SchemaMergeDiffViewer
            className="flex-1"
            currentLabel={currentLabel}
            currentDocument={currentDocument}
            incomingLabel={incomingLabel}
            incomingDocument={incomingDocument}
            changes={diff?.changes}
            onResolve={setResolution}
          />
        ) : (
          <AppCopy>Loading diff.</AppCopy>
        )}
      </AppSurface>
    </AppPage>
  );
}

const defaultSide = (change: SchemaDraftChangeDto): SchemaDraftMergeSide =>
  change.draftChanged ? "incoming" : "current";

const normalizeBindings = (bindings: Array<SchemaDraftBindingDto | SchemaModelBindingDto>) =>
  bindings.map(({ modelId, modelName, pluginPolicy }) => ({
    modelId,
    modelName,
    pluginPolicy: pluginPolicy ?? {},
  }));

const toCodeLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "untitled";
