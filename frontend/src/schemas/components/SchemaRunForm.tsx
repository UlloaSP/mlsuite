/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { themeWithHtmlAtom } from "../../app/atoms";
import { AppCopy, AppPanel, AppButton } from "../../app/components";
import { applyPredictionInputsToSchema } from "../../algorithms/mlform/schema-compat";
import { mountSchemaRunForm } from "../../app/utils/mlform/schema-run-mount";
import {
  buildSchemaRunRawFromSubmitResult,
  reportStatesFromSnapshot,
} from "../../algorithms/mlform/schema-run-result-state";
import { isRecord } from "../../algorithms/mlform/shared";
import { schemaRunDebug, schemaRunDebugError } from "../../algorithms/schema/run-debug";
import type { JsonRecord, SchemaVersionDto } from "../../api/schemas/dtos";
import { getSchemaRunPrefillInputs } from "../../algorithms/schema/input-display";
import { useSchemaPluginCatalog } from "../useSchemaPluginCatalog";

type Props = {
  version: SchemaVersionDto;
  initialInputs?: JsonRecord;
  onSubmit: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
  onResultUpdate?: (inputData: JsonRecord, raw: JsonRecord, reportsPending: boolean) => void;
};

export function SchemaRunForm({ version, initialInputs, onSubmit, onResultUpdate }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onSubmitRef = useRef(onSubmit);
  const onResultUpdateRef = useRef(onResultUpdate);
  const [theme] = useAtom(themeWithHtmlAtom);
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
  const catalog = useSchemaPluginCatalog(formSchema);
  const { data, needsPlugins, status } = catalog;
  schemaRunDebug("form.render", {
    versionId: version.id,
    needsPlugins,
    catalogStatus: status,
    bindings: version.bindings.length,
  });

  useEffect(() => {
    onSubmitRef.current = onSubmit;
    onResultUpdateRef.current = onResultUpdate;
  }, [onResultUpdate, onSubmit]);

  useEffect(() => {
    if (!containerRef.current || (needsPlugins && status !== "ready")) {
      schemaRunDebug("form.mount.wait", {
        hasContainer: Boolean(containerRef.current),
        needsPlugins,
        status,
      });
      return;
    }
    try {
      schemaRunDebug("form.mount.start", {
        versionId: version.id,
        fieldDefinitions: data.fieldDefinitions.map((definition) => definition.kind),
        reportDefinitions: data.reportDefinitions.map((definition) => definition.kind),
      });
      const mounted = mountSchemaRunForm({
        container: containerRef.current,
        schema: formSchema,
        bindings: version.bindings,
        theme,
        customFieldDefinitions: data.fieldDefinitions,
        customReportDefinitions: data.reportDefinitions,
        onSubmit(inputData, raw, reportsPending) {
          schemaRunDebug("form.submit.callback", {
            inputData,
            raw,
            inputKeys: Object.keys(inputData),
            rawKeys: Object.keys(raw),
            reportsPending,
          });
          onSubmitRef.current(inputData, raw, reportsPending);
        },
        onSubmitError(error) {
          schemaRunDebugError("form.submit.error", error);
          toast.error("Schema run failed", {
            description: error instanceof Error ? error.message : String(error),
          });
        },
      });
      const unsubscribe = mounted.form.subscribe((state) => {
        if (!state.lastResult || !onResultUpdateRef.current) return;
        schemaRunDebug("form.subscribe.state", {
          lastResult: state.lastResult,
          reportStates: state.reportStates,
          reports: mounted.form.reports,
        });
        const raw = isRecord(state.lastResult.raw)
          ? state.lastResult.raw
          : { raw: state.lastResult.raw };
        const next = buildSchemaRunRawFromSubmitResult(
          raw,
          mounted.form.reports,
          reportStatesFromSnapshot(state.reportStates),
          version.bindings,
        );
        schemaRunDebug("form.result-update", {
          inputData: isRecord(next.raw.inputData) ? next.raw.inputData : {},
          raw: next.raw,
          reportCount: Array.isArray(next.raw.reports) ? next.raw.reports.length : 0,
          reportsPending: next.reportsPending,
        });
        onResultUpdateRef.current(
          isRecord(next.raw.inputData) ? next.raw.inputData : {},
          next.raw,
          next.reportsPending,
        );
      });
      return () => {
        schemaRunDebug("form.mount.cleanup", { versionId: version.id });
        unsubscribe();
        mounted.unmount();
      };
    } catch (error) {
      schemaRunDebugError("form.mount.error", error);
      toast.error("Schema incompatible", {
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [
    data.fieldDefinitions,
    data.reportDefinitions,
    formSchema,
    needsPlugins,
    status,
    theme,
    version.bindings,
    version.id,
  ]);

  return version.bindings.length === 0 ? (
    <AppPanel>
      <AppCopy>This schema version has no model bindings.</AppCopy>
    </AppPanel>
  ) : needsPlugins && status !== "ready" ? (
    <AppPanel className="space-y-4">
      <h2 className="text-lg font-semibold text-[var(--text-primary)]">
        {status === "loading" ? "Loading plugin catalog" : "Plugin catalog unavailable"}
      </h2>
      <AppCopy>
        {status === "loading"
          ? "Schema form waits for plugin definitions before rendering custom fields and reports."
          : catalog.error}
      </AppCopy>
      {status === "error" ? (
        <AppButton type="button" onClick={() => void catalog.retry()}>
          Retry
        </AppButton>
      ) : null}
    </AppPanel>
  ) : (
    <div className="size-full min-h-0 overflow-auto" ref={containerRef} />
  );
}
