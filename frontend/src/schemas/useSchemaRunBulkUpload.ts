/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { SubmitRequest } from "mlform/runtime";
import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { createSchemaRunRuntime } from "../algorithms/schema/runtime-assembly";
import { isRecord } from "../algorithms/mlform/shared";
import { loadPredictionCatalogDefinitions } from "../algorithms/models/prediction-catalog-definitions";
import { parseSpreadsheetPredictionFile } from "../algorithms/models/parse-spreadsheet-prediction-file";
import { createPredictionRun, getLastPredictionRunId } from "./api/schemaService";
import { PREDICTION_RUNS_QUERY_KEY } from "./hooks";
import { prependMissingPredictionRuns } from "../algorithms/schema/run-cache";
import { getModelInputBulkSchema, toSchemaRunSerializedValues } from "../algorithms/schema/bulk-upload";
import type { CreatePredictionRunRequest, PredictionRunDto, SchemaVersionDto } from "./types";

type Status = "idle" | "parsing" | "processing" | "done";

const INITIAL = {
  status: "idle" as Status,
  processed: 0,
  total: 0,
  saved: 0,
  failed: 0,
  skipped: 0,
};
const MAX_RECORDS = 10000;

export function useSchemaRunBulkUpload(version: SchemaVersionDto, historyVersionId = version.id) {
  const [state, setState] = useState(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();
  const runsQueryKey = PREDICTION_RUNS_QUERY_KEY(historyVersionId);

  const cancel = () => abortRef.current?.abort();
  const reset = () => setState(INITIAL);

  const start = async (file: File) => {
    try {
      setState({ ...INITIAL, status: "parsing" });
      const lastPredictionRunId = await getLastPredictionRunId();
      const parsed = await parseSpreadsheetPredictionFile(
        file,
        getModelInputBulkSchema(version),
        MAX_RECORDS,
        lastPredictionRunId,
      );
      parsed.skipped
        .slice(0, 5)
        .forEach((entry) =>
          toast.error(`Skipped line ${entry.line}`, { description: entry.reason }),
        );
      if (parsed.records.length === 0) {
        setState({ ...INITIAL, status: "done", skipped: parsed.skipped.length });
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const catalog = await loadPredictionCatalogDefinitions();
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
        saved: 0,
        failed: 0,
        skipped: parsed.skipped.length,
      });

      let saved = 0;
      let failed = 0;
      const savedRuns: PredictionRunDto[] = [];
      for (let index = 0; index < parsed.records.length; index += 1) {
        if (controller.signal.aborted) break;
        const record = parsed.records[index];
        try {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- Bulk upload is intentionally sequential for progress, cancellation, and backend load control.
          const result = await runtime.transport.submit({
            serializedValues: toSchemaRunSerializedValues(version, record.inputs),
            reports: runtime.formSchema.reports,
          } as unknown as SubmitRequest);
          const raw = isRecord(result) && isRecord(result.raw) ? result.raw : {};
          const request: CreatePredictionRunRequest = {
            name: record.name,
            inputData: isRecord(raw.inputData) ? raw.inputData : record.inputs,
            results: Array.isArray(raw.results) ? raw.results : [],
          };
          const savedRun = await createPredictionRun(version.id, request);
          savedRuns.push(savedRun);
          saved += 1;
        } catch (error) {
          failed += 1;
          toast.error(`Failed: ${record.name}`, {
            description: error instanceof Error ? error.message : String(error),
          });
        }
        setState((current) => ({ ...current, processed: index + 1, saved, failed }));
      }

      setState((current) => ({ ...current, status: "done", saved, failed }));
      toast.success(`Bulk upload complete: ${saved} saved, ${failed} failed`);
      if (savedRuns.length > 0) {
        queryClient.setQueryData<PredictionRunDto[]>(runsQueryKey, (current) =>
          prependMissingPredictionRuns(current, savedRuns),
        );
      }
      queryClient.invalidateQueries({ queryKey: runsQueryKey });
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
