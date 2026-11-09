/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "@/shared/ui/toast";
import { useCurrentOrganizationId } from "@/capabilities/workspace-context/workspace-context";
import { parseSpreadsheetPredictionFile } from "@/capabilities/prediction-runtime/data/parse-spreadsheet-prediction-file";
import { applySchemaRunInputMapping } from "@/capabilities/prediction-runtime/mlform/model-input-mapping";
import type { PredictionPayloadField } from "@/capabilities/prediction-runtime/mlform/shared";
import { snapshotCatalogQueryOptions } from "@/capabilities/prediction-runtime/plugins/schema-plugin-catalog";
import { prepareSchemaRun } from "@/capabilities/prediction-runtime/sandbox/plugin-sandbox-services";
import { useStartPredictionJob } from "@/features/schemas/api/prediction-job-queries";
import { getModelInputBulkSchema } from "@/features/schemas/lib/bulk-upload";
import type { SchemaVersionDto } from "@/shared/api/openapi.gen";

/** The most rows one bulk upload holds (mlsuite.prediction-jobs.max-rows on the server). */
export const MAX_BULK_ROWS = 10000;

/** A line of the last file that was not sent, and why; line 0 is the whole file. */
export type SkippedBulkLine = { line: number; reason: string };

/** What of the last file was not sent: some data lines, or the whole file and why. */
export type SkippedBulkFile = { lines: SkippedBulkLine[]; fileRejected: boolean };

const NOTHING_SKIPPED: SkippedBulkFile = { lines: [], fileRejected: false };

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Starts a bulk upload: the file is read and each row mapped to every bound model's record here,
 * as a single run is, and the rows are sent once; the server then runs them as a job that goes on
 * after this tab closes and saves each row as a run.
 */
export function useBulkJobUpload(bookmarkId: string, version: SchemaVersionDto) {
  const organizationId = useCurrentOrganizationId() ?? "none";
  const queryClient = useQueryClient();
  const { mutateAsync: startJob } = useStartPredictionJob(bookmarkId);
  // Shown in the dialog that started the upload, until the next file replaces them.
  const [skipped, setSkipped] = useState<SkippedBulkFile>(NOTHING_SKIPPED);

  // Resolves to the number of rows sent to the server, 0 when the file had none to run.
  const upload = useMutation({
    mutationFn: async (file: File) => {
      setSkipped(NOTHING_SKIPPED);
      const parsed = await parseSpreadsheetPredictionFile(
        file,
        getModelInputBulkSchema(version),
        MAX_BULK_ROWS,
        `bulk-upload-${crypto.randomUUID()}`,
      );
      setSkipped({ lines: parsed.skipped, fileRejected: parsed.fileRejected });
      if (parsed.records.length === 0) return 0;
      const plugins = await queryClient.fetchQuery(
        snapshotCatalogQueryOptions(organizationId, version.id),
      );
      // The schema is normalized with its plugins in the sandbox, as for a single run.
      const run = await prepareSchemaRun(version.formSchema, version.bindings, plugins);
      const fields = run.fields as unknown as PredictionPayloadField[];
      await startJob({
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
      return parsed.records.length;
    },
    onSuccess: (rows) => {
      if (rows === 0) toast.warning("Bulk upload not started: the file has no rows to run");
      else toast.success(`Bulk upload started: ${rows} rows run on the server`);
    },
    onError: (error) =>
      toast.error("Bulk upload could not start", { description: errorMessage(error) }),
    meta: { errorHandledLocally: true },
  });

  return { start: upload.mutate, preparing: upload.isPending, skipped };
}
