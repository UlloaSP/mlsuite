/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useAtom } from "jotai";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { themeWithHtmlAtom } from "../../app/atoms";
import { AppCopy, AppPanel } from "../../app/components/ui";
import { AppButton } from "../../app/components/ui-controls";
import { applyPredictionInputsToSchema } from "../../app/utils/mlform/schema";
import { mountSchemaRunForm } from "../../app/utils/mlform/schema-run-mount";
import {
  buildSchemaRunRawFromSubmitResult,
  reportStatesFromSnapshot,
} from "../../app/utils/mlform/schema-run-result-state";
import { isRecord } from "../../app/utils/mlform/shared";
import type { JsonRecord, SchemaVersionDto } from "../types";
import { getSchemaRunPrefillInputs } from "../schema-run-display";
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

  useEffect(() => {
    onSubmitRef.current = onSubmit;
    onResultUpdateRef.current = onResultUpdate;
  }, [onResultUpdate, onSubmit]);

  useEffect(() => {
    if (!containerRef.current || (needsPlugins && status !== "ready")) return;
    try {
      const mounted = mountSchemaRunForm({
        container: containerRef.current,
        schema: formSchema,
        bindings: version.bindings,
        theme,
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
      });
      const unsubscribe = mounted.form.subscribe((state) => {
        if (!state.lastResult || !onResultUpdateRef.current) return;
        const raw = isRecord(state.lastResult.raw) ? state.lastResult.raw : { raw: state.lastResult.raw };
        const next = buildSchemaRunRawFromSubmitResult(
          raw,
          mounted.form.reports,
          reportStatesFromSnapshot(state.reportStates),
          version.bindings,
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
    needsPlugins,
    status,
    theme,
    version.bindings,
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
          ? "Schema form waits for active plugin definitions before rendering custom fields and reports."
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
