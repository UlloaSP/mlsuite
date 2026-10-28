/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { parseSpreadsheetPredictionFile } from "@/capabilities/prediction-runtime/data/parse-spreadsheet-prediction-file";
import { applySchemaRunInputMapping } from "@/capabilities/prediction-runtime/mlform/model-input-mapping";
import type { PredictionPayloadField } from "@/capabilities/prediction-runtime/mlform/shared";
import { predictionCatalogQueryOptions } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { prepareSchemaRun } from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox-services";
import { startPredictionJob } from "@/features/schemas/api/prediction-job-api";
import { predictionJobsKey } from "@/features/schemas/api/prediction-job-queries";
import { getModelInputBulkSchema } from "@/features/schemas/lib/bulk-upload";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

/** The most rows one bulk upload holds (mlsuite.prediction-jobs.max-rows on the server). */
export const MAX_BULK_ROWS = 10000;
const REASONS_SHOWN = 3;

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

const describe = (reasons: readonly string[]) => {
  const distinct = [...new Set(reasons)];
  const shown = distinct.slice(0, REASONS_SHOWN).join("; ");
  return distinct.length > REASONS_SHOWN
    ? `${shown}; and ${distinct.length - REASONS_SHOWN} more`
    : shown;
};

/**
 * Starts a bulk upload: the file is read and each row mapped to every bound model's record here,
 * as a single run is, and the rows are sent once; the server then runs them as a job that goes on
 * after this tab closes and saves each row as a run.
 */
export function useBulkJobUpload(bookmarkId: string, version: SchemaVersionDto) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const queryClient = useQueryClient();
  const [preparing, setPreparing] = useState(false);

  const start = async (file: File) => {
    setPreparing(true);
    try {
      const parsed = await parseSpreadsheetPredictionFile(
        file,
        getModelInputBulkSchema(version),
        MAX_BULK_ROWS,
        `bulk-upload-${crypto.randomUUID()}`,
      );
      if (parsed.skipped.length > 0) {
        const lines = parsed.skipped.length;
        toast.error(`Skipped ${lines} line${lines === 1 ? "" : "s"}`, {
          description: describe(
            parsed.skipped.map((entry) => `line ${entry.line}: ${entry.reason}`),
          ),
        });
      }
      if (parsed.records.length === 0) {
        toast.warning("Bulk upload not started: the file has no rows to run");
        return;
      }
      const plugins = await queryClient.fetchQuery(predictionCatalogQueryOptions(organizationId));
      // The schema is normalized with its plugins in the sandbox, as for a single run.
      const run = await prepareSchemaRun(version.formSchema, version.bindings, plugins);
      const fields = run.fields as unknown as PredictionPayloadField[];
      await startPredictionJob(bookmarkId, {
        schemaVersionId: version.id,
        rows: parsed.records.map((record) => ({
          name: record.name,
          inputData: record.inputs,
          models: version.bindings.map((binding) => ({
            modelId: binding.modelId,
            modelInput: applySchemaRunInputMapping(record.inputs, fields, binding),
          })),
        })),
      });
      toast.success(`Bulk upload started: ${parsed.records.length} rows run on the server`);
    } catch (error) {
      toast.error("Bulk upload could not start", { description: errorMessage(error) });
    } finally {
      setPreparing(false);
      void queryClient.invalidateQueries({
        queryKey: predictionJobsKey(organizationId, bookmarkId),
      });
    }
  };

  return { start, preparing };
}
