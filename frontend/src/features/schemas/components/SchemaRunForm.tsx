/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPanel } from "@/shared/ui/AppPanel";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { AppButton } from "@/shared/ui/AppButton";
import { applyPredictionInputsToSchema } from "@/capabilities/prediction-runtime/mlform/schema-inputs";
import { mountSandboxedSchemaRunForm } from "@/capabilities/prediction-runtime/sandbox/sandboxed-forms";
import type { JsonRecord } from "@/features/schemas/api/schema-types";
import { getSchemaRunPrefillInputs } from "@/capabilities/prediction-runtime/data/input-display";
import { useSchemaPluginCatalog } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

type Props = {
  bookmarkId: string;
  version: SchemaVersionDto;
  initialInputs?: JsonRecord;
  onSubmit: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
  onResultUpdate?: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
  onRunningChange?: (running: boolean) => void;
};

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** A schema version's run form, drawn in the plugin sandbox with the organization's plugins. */
export function SchemaRunForm({
  bookmarkId,
  version,
  initialInputs,
  onSubmit,
  onResultUpdate,
  onRunningChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSubmitRef = useRef(onSubmit);
  const onResultUpdateRef = useRef(onResultUpdate);
  const onRunningChangeRef = useRef(onRunningChange);
  const formSchema = useMemo(
    () =>
      initialInputs && Object.keys(initialInputs).length > 0
        ? applyPredictionInputsToSchema(
            version.formSchema,
            getSchemaRunPrefillInputs(version.formSchema, initialInputs),
          )
        : version.formSchema,
    [initialInputs, version.formSchema],
  );
  const catalog = useSchemaPluginCatalog(formSchema, useCurrentOrganizationId() ?? "none");
  const { data, needsPlugins, status } = catalog;
  const showCatalogLoading = useStableLoading(needsPlugins && status === "loading");

  useEffect(() => {
    onSubmitRef.current = onSubmit;
    onResultUpdateRef.current = onResultUpdate;
    onRunningChangeRef.current = onRunningChange;
  }, [onResultUpdate, onRunningChange, onSubmit]);

  useEffect(() => {
    if (showCatalogLoading || !containerRef.current || (needsPlugins && status !== "ready")) return;
    const mounted = mountSandboxedSchemaRunForm({
      container: containerRef.current,
      target: { bookmarkId, schemaVersionId: version.id },
      schema: formSchema,
      bindings: version.bindings,
      plugins: data,
      onSubmit: (...result) => onSubmitRef.current(...result),
      onResultUpdate: (...result) => onResultUpdateRef.current?.(...result),
      onSubmitError: (error) => toast.error("Schema run failed", { description: errorText(error) }),
      onRunningChange: (running) => onRunningChangeRef.current?.(running),
      onMountError: (error) =>
        toast.error("Schema incompatible", { description: errorText(error) }),
    });
    return () => mounted.unmount();
  }, [
    bookmarkId,
    data,
    formSchema,
    needsPlugins,
    showCatalogLoading,
    status,
    version.bindings,
    version.id,
  ]);

  return version.bindings.length === 0 ? (
    <AppPanel>
      <AppCopy>This schema version has no model bindings.</AppCopy>
    </AppPanel>
  ) : showCatalogLoading ? (
    <AppLoadingState compact label="Loading plugin catalog" />
  ) : needsPlugins && status !== "ready" ? (
    <AppPanel className="space-y-4">
      <h2 className="text-lg font-semibold text-fg">Plugin catalog unavailable</h2>
      <AppCopy>{catalog.error}</AppCopy>
      <AppButton type="button" onClick={() => void catalog.retry()}>
        Retry
      </AppButton>
    </AppPanel>
  ) : (
    <div className="size-full min-h-0" ref={containerRef} />
  );
}
