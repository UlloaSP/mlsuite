/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { themeWithHtmlAtom } from "@/shared/ui/appearance-state";
import { AppCopy } from "@/shared/ui/AppCopy";
import { AppLoadingState } from "@/shared/ui/AppLoadingState";
import { AppPanel } from "@/shared/ui/AppPanel";
import { useStableLoading } from "@/shared/ui/useStableLoading";
import { AppButton } from "@/shared/ui/AppButton";
import { applyPredictionInputsToSchema } from "@/capabilities/prediction-runtime/mlform/schema-inputs";
import { mountSchemaRunForm } from "@/capabilities/prediction-runtime/mlform/schema-run-mount";
import {
  buildSchemaRunRawFromSubmitResult,
  reportStatesFromSnapshot,
} from "@/capabilities/prediction-runtime/mlform/schema-run-result-state";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import type { JsonRecord, SchemaVersionDto } from "@/features/schemas/api/schema-types";
import { getSchemaRunPrefillInputs } from "@/capabilities/prediction-runtime/data/input-display";
import { useSchemaPluginCatalog } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";

type Props = {
  version: SchemaVersionDto;
  initialInputs?: JsonRecord;
  onSubmit: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
  onResultUpdate?: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
  onRunningChange?: (running: boolean) => void;
};

export function SchemaRunForm({
  version,
  initialInputs,
  onSubmit,
  onResultUpdate,
  onRunningChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef<ReturnType<typeof mountSchemaRunForm> | null>(null);
  const onSubmitRef = useRef(onSubmit);
  const onResultUpdateRef = useRef(onResultUpdate);
  const onRunningChangeRef = useRef(onRunningChange);
  const [theme] = useAtom(themeWithHtmlAtom);
  const [initialTheme] = useState(theme);
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
    try {
      const mounted = mountSchemaRunForm({
        container: containerRef.current,
        schema: formSchema,
        bindings: version.bindings,
        theme: initialTheme,
        customFieldDefinitions: data.fieldDefinitions,
        customReportDefinitions: data.reportDefinitions,
        onSubmit(inputData, raw, reportsPending) {
          onSubmitRef.current(inputData, raw, reportsPending);
        },
        onSubmitError(error) {
          toast.error("Schema run failed", {
            description: error instanceof Error ? error.message : String(error),
          });
        },
        onRunningChange(running) {
          onRunningChangeRef.current?.(running);
        },
      });
      mountedRef.current = mounted;
      const unsubscribe = mounted.form.subscribe((state) => {
        if (!state.lastResult || !onResultUpdateRef.current) return;
        const raw = isRecord(state.lastResult.raw)
          ? state.lastResult.raw
          : { raw: state.lastResult.raw };
        const next = buildSchemaRunRawFromSubmitResult(
          raw,
          mounted.form.reports,
          reportStatesFromSnapshot(state.reportStates),
          version.bindings,
          state.lastResult.reportContexts,
        );
        onResultUpdateRef.current(
          isRecord(next.raw.inputData) ? next.raw.inputData : {},
          next.raw,
          next.reportsPending,
        );
      });
      return () => {
        unsubscribe();
        mounted.unmount();
        if (mountedRef.current === mounted) mountedRef.current = null;
      };
    } catch (error) {
      toast.error("Schema incompatible", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [
    data.fieldDefinitions,
    data.reportDefinitions,
    formSchema,
    initialTheme,
    needsPlugins,
    showCatalogLoading,
    status,
    version.bindings,
    version.id,
  ]);

  useEffect(() => {
    mountedRef.current?.updateTheme(theme);
  }, [theme]);

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
    <div className="size-full min-h-0 overflow-auto" ref={containerRef} />
  );
}
