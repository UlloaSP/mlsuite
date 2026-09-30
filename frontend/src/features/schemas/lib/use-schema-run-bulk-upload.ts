/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { createSchemaRunRuntime } from "@/capabilities/prediction-runtime/mlform/runtime-assembly";
import { isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { predictionCatalogQueryOptions } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { parseSpreadsheetPredictionFile } from "@/capabilities/prediction-runtime/data/parse-spreadsheet-prediction-file";
import { bulkUploadSummary, getModelInputBulkSchema } from "@/features/schemas/lib/bulk-upload";
import type { SubmitRequest } from "mlform/runtime";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";
import type { useInferenceSession } from "./use-inference-session";

type Status = "idle" | "parsing" | "processing" | "done";

const INITIAL = {
  status: "idle" as Status,
  processed: 0,
  total: 0,
  added: 0,
  failed: 0,
  skipped: 0,
};
const MAX_RECORDS = 10000;

export function useSchemaRunBulkUpload(
  version: SchemaVersionDto,
  onResult: ReturnType<typeof useInferenceSession>["addResult"],
) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const [state, setState] = useState(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => () => abortRef.current?.abort(), [onResult, version.id]);

  const cancel = () => abortRef.current?.abort();
  const reset = () => setState(INITIAL);

  const start = async (file: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      setState({ ...INITIAL, status: "parsing" });
      const parsed = await parseSpreadsheetPredictionFile(
        file,
        getModelInputBulkSchema(version),
        MAX_RECORDS,
        `bulk-upload-${crypto.randomUUID()}`,
      );
      if (controller.signal.aborted) {
        setState((current) => ({ ...current, status: "done" }));
        return;
      }
      parsed.skipped
        .slice(0, 5)
        .forEach((entry) =>
          toast.error(`Skipped line ${entry.line}`, { description: entry.reason }),
        );
      if (parsed.records.length === 0) {
        setState({ ...INITIAL, status: "done", skipped: parsed.skipped.length });
        toast.warning(
          `Bulk upload complete: ${bulkUploadSummary(0, 0, parsed.skipped.length).message}`,
        );
        return;
      }

      const catalog = await queryClient.fetchQuery(predictionCatalogQueryOptions(organizationId));
      if (controller.signal.aborted) {
        setState((current) => ({ ...current, status: "done" }));
        return;
      }
      const runtime = createSchemaRunRuntime({
        schema: version.formSchema,
        bindings: version.bindings,
        customFieldDefinitions: catalog.fieldDefinitions,
        customReportDefinitions: catalog.reportDefinitions,
      });

      setState({
        status: "processing",
        processed: 0,
        total: parsed.records.length,
        added: 0,
        failed: 0,
        skipped: parsed.skipped.length,
      });

      let added = 0;
      let failed = 0;
      for (let index = 0; index < parsed.records.length; index += 1) {
        if (controller.signal.aborted) break;
        const record = parsed.records[index];
        try {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- Bulk upload is intentionally sequential for progress, cancellation, and backend load control.
          const result = await runtime.transport.submit({
            inputs: [],
            displayValues: record.inputs,
            modelValues: record.inputs,
            reports: runtime.formSchema.reports,
          } as unknown as SubmitRequest);
          if (controller.signal.aborted) break;
          const raw = isRecord(result) && isRecord(result.raw) ? result.raw : {};
          onResult(record.name, isRecord(raw.inputData) ? raw.inputData : record.inputs, raw);
          added += 1;
        } catch (error) {
          if (controller.signal.aborted) break;
          failed += 1;
          toast.error(`Failed: ${record.name}`, {
            description: error instanceof Error ? error.message : String(error),
          });
        }
        setState((current) => ({ ...current, processed: index + 1, added, failed }));
      }

      setState((current) => ({ ...current, status: "done", added, failed }));
      const summary = bulkUploadSummary(
        added,
        failed,
        parsed.skipped.length,
        parsed.records.length - added - failed,
      );
      const notify = summary.warning ? toast.warning : toast.success;
      notify(
        `Bulk upload ${controller.signal.aborted ? "cancelled" : "complete"}: ${summary.message}`,
      );
    } catch (error) {
      setState(INITIAL);
      toast.error("Bulk upload could not start", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      abortRef.current = null;
    }
  };

  return { ...state, start, cancel, reset };
}
