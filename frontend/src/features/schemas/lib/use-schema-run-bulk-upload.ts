/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  runSchemaBatch,
  SCHEMA_RUN_BATCH_SIZE,
} from "@/capabilities/prediction-runtime/mlform/schema-run-batch";
import type { PredictionPayloadField } from "@/capabilities/prediction-runtime/mlform/shared";
import { predictionCatalogQueryOptions } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { prepareSchemaRun } from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox-services";
import { parseSpreadsheetPredictionFile } from "@/capabilities/prediction-runtime/data/parse-spreadsheet-prediction-file";
import { bulkUploadSummary, getModelInputBulkSchema } from "@/features/schemas/lib/bulk-upload";
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
/** How many distinct reasons a failure or skip notice names. */
const REASONS_SHOWN = 3;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** One notice for many problems: how many, and the first few distinct reasons. */
const describe = (reasons: readonly string[]) => {
  const distinct = [...new Set(reasons)];
  const shown = distinct.slice(0, REASONS_SHOWN).join("; ");
  return distinct.length > REASONS_SHOWN
    ? `${shown}; and ${distinct.length - REASONS_SHOWN} more`
    : shown;
};

/**
 * Runs a spreadsheet's records against the bookmark's snapshot a batch at a time (one request
 * per bound model and batch), adding each batch's rows to the session as it completes. Stop
 * aborts the batch in flight; the rows already added stay.
 */
export function useSchemaRunBulkUpload(
  bookmarkId: string,
  version: SchemaVersionDto,
  onResults: ReturnType<typeof useInferenceSession>["addResults"],
) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const [state, setState] = useState(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => () => abortRef.current?.abort(), [onResults, version.id]);

  const cancel = () => abortRef.current?.abort();
  const reset = () => setState(INITIAL);

  const start = async (file: File) => {
    const controller = new AbortController();
    abortRef.current = controller;
    const { signal } = controller;
    try {
      setState({ ...INITIAL, status: "parsing" });
      const parsed = await parseSpreadsheetPredictionFile(
        file,
        getModelInputBulkSchema(version),
        MAX_RECORDS,
        `bulk-upload-${crypto.randomUUID()}`,
      );
      if (signal.aborted) {
        setState((current) => ({ ...current, status: "done" }));
        return;
      }
      if (parsed.skipped.length > 0) {
        const lines = parsed.skipped.length;
        toast.error(`Skipped ${lines} line${lines === 1 ? "" : "s"}`, {
          description: describe(
            parsed.skipped.map((entry) => `line ${entry.line}: ${entry.reason}`),
          ),
        });
      }
      if (parsed.records.length === 0) {
        setState({ ...INITIAL, status: "done", skipped: parsed.skipped.length });
        toast.warning(
          `Bulk upload complete: ${bulkUploadSummary(0, 0, parsed.skipped.length).message}`,
        );
        return;
      }

      const plugins = await queryClient.fetchQuery(predictionCatalogQueryOptions(organizationId));
      // The schema is normalized with its plugins in the sandbox; the app runs the records.
      const run = await prepareSchemaRun(version.formSchema, version.bindings, plugins);
      if (signal.aborted) {
        setState((current) => ({ ...current, status: "done" }));
        return;
      }
      const fields = run.fields as unknown as PredictionPayloadField[];
      const target = { bookmarkId, schemaVersionId: version.id };

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
      const failures: string[] = [];
      for (
        let from = 0;
        from < parsed.records.length && !signal.aborted;
        from += SCHEMA_RUN_BATCH_SIZE
      ) {
        const batch = parsed.records.slice(from, from + SCHEMA_RUN_BATCH_SIZE);
        try {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- One batch at a time keeps progress, Stop and the server's queue honest.
          const results = await runSchemaBatch(
            target,
            version.bindings,
            fields,
            batch.map((record) => record.inputs),
            signal,
          );
          if (signal.aborted) break;
          onResults(
            batch.map((record, index) => ({
              name: record.name,
              inputData: record.inputs,
              results: results[index]!,
            })),
          );
          added += batch.length;
        } catch (error) {
          if (signal.aborted) break;
          failed += batch.length;
          failures.push(errorMessage(error));
        }
        setState((current) => ({
          ...current,
          processed: Math.min(from + batch.length, parsed.records.length),
          added,
          failed,
        }));
      }

      setState((current) => ({ ...current, status: "done", added, failed }));
      if (failed > 0) {
        toast.error(`${failed} row${failed === 1 ? "" : "s"} could not run`, {
          description: describe(failures),
        });
      }
      const summary = bulkUploadSummary(
        added,
        failed,
        parsed.skipped.length,
        parsed.records.length - added - failed,
      );
      const notify = summary.warning ? toast.warning : toast.success;
      notify(`Bulk upload ${signal.aborted ? "cancelled" : "complete"}: ${summary.message}`);
    } catch (error) {
      setState(INITIAL);
      toast.error("Bulk upload could not start", { description: errorMessage(error) });
    } finally {
      abortRef.current = null;
    }
  };

  return { ...state, start, cancel, reset };
}
