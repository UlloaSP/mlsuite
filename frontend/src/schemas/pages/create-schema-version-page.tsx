/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { RefreshCcw, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import {
  AppPage,
  AppPageHeader,
  AppSurface,
  AppButton,
  AppSelect,
  AppTextField,
} from "../../app/components";
import { isRecord } from "../../algorithms/mlform/shared";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "../../editor/atoms";
import { EditorWrapper } from "../../editor/components/EditorWrapper";
import {
  useCreateSchemaVersionMutation,
  useSchema,
  useSchemaVersions,
} from "../../api/schemas/hooks";
import { prepareSchemaVersionForSave } from "../../algorithms/schema/binding-rebase";
import {
  schemaVersionId,
  selectSchemaVersion,
  sortSchemaVersions,
} from "../../algorithms/schema/version-selection";
import type { CreateSchemaVersionRequest } from "../../api/schemas/dtos";

export function CreateSchemaVersionPage() {
  const { schemaId } = useParams<{ schemaId: string }>();
  const navigate = useNavigate();
  const { data: schemaDto } = useSchema(schemaId);
  const { data: versions = [] } = useSchemaVersions(schemaId);
  const mutation = useCreateSchemaVersionMutation(schemaId ?? "");
  const [, setSchema] = useAtom(schemaAtom);
  const [schemaText, setSchemaText] = useAtom(schemaTextAtom);
  const [schemaErrors] = useAtom(schemaErrorsAtom);
  const [baseVersionId, setBaseVersionId] = useState("");
  const [versionName, setVersionName] = useState("");

  const sortedVersions = useMemo(() => sortSchemaVersions(versions), [versions]);
  const effectiveBaseId = baseVersionId || schemaVersionId(sortedVersions[0]);
  const baseVersion = selectSchemaVersion(sortedVersions, effectiveBaseId);
  const editorHasErrors = Array.isArray(schemaErrors) && schemaErrors.length > 0;
  const canSave = Boolean(schemaId && baseVersion && versionName.trim() && !editorHasErrors);

  useEffect(() => {
    if (!baseVersion) return;
    setSchema(baseVersion.formSchema);
    setSchemaText(JSON.stringify(baseVersion.formSchema, null, 2));
  }, [baseVersion, setSchema, setSchemaText]);

  const save = async () => {
    if (!schemaId || !baseVersion || !canSave) return;
    try {
      const currentSchema = JSON.parse(schemaText);
      const request: CreateSchemaVersionRequest = {
        name: versionName,
        formSchema: isRecord(currentSchema) ? currentSchema : baseVersion.formSchema,
        bindings: baseVersion.bindings.map((binding) => ({
          modelId: binding.modelId,
          modelName: binding.modelName,
          pluginPolicy: binding.pluginPolicy ?? undefined,
        })),
      };
      const prepared = prepareSchemaVersionForSave(request, request.formSchema);
      await mutation.mutateAsync({
        ...prepared,
      });
      navigate(`/schemas/${schemaId}`);
    } catch (error) {
      toast.error("Schema version save failed", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  };

  return (
    <AppPage>
      <AppSurface className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
        <AppPageHeader
          title="New schema version"
          description={schemaDto ? `${schemaDto.name} lineage` : "Schema lineage"}
          breadcrumbs={[
            { label: "Schemas", to: "/schemas" },
            ...(schemaId
              ? [{ label: schemaDto?.name ?? "Schema", to: `/schemas/${schemaId}` }]
              : []),
            { label: "New Version" },
          ]}
        />
        <div className="grid gap-4 xl:grid-cols-[minmax(240px,1fr)_minmax(260px,1fr)_auto]">
          <div className="space-y-2">
            <label
              htmlFor="base-version"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Base version
            </label>
            <AppSelect
              id="base-version"
              value={effectiveBaseId}
              onValueChange={setBaseVersionId}
              disabled={!sortedVersions.length}
              className="w-full"
              options={
                sortedVersions.length
                  ? sortedVersions.map((version) => ({
                      value: schemaVersionId(version),
                      label: `${version.name} · v${version.version}`,
                    }))
                  : [{ value: "", label: "No versions available" }]
              }
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="version-name"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Version name
            </label>
            <AppTextField
              id="version-name"
              value={versionName}
              placeholder="Schema refinement"
              onChange={(event) => setVersionName(event.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex min-w-[180px] items-end">
            <AppButton onClick={save} disabled={!canSave || mutation.isPending} className="w-full">
              {mutation.isPending ? (
                <>
                  <span className="animate-spin">
                    <RefreshCcw size={18} />
                  </span>
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save version
                </>
              )}
            </AppButton>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <EditorWrapper />
        </div>
      </AppSurface>
    </AppPage>
  );
}