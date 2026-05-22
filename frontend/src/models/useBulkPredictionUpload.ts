/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { createPrediction, createTarget, getLastPredictionId } from "./api/modelService";
import { derivePredictionTargets } from "./derivePredictionTargets";
import { loadPredictionCatalogDefinitions } from "./loadPredictionCatalogDefinitions";
import {
  type BulkPredictionRecord,
  parseSpreadsheetPredictionFile,
  type SkippedRecord,
} from "./parseSpreadsheetPredictionFile";
import { runBulkPredictionPipeline } from "./runBulkPredictionPipeline";

type BulkUploadStatus = "idle" | "parsing" | "processing" | "done";

export interface BulkUploadState {
  status: BulkUploadStatus;
  processed: number;
  total: number;
  saved: number;
  failed: number;
  skipped: number;
}

const INITIAL_STATE: BulkUploadState = {
  status: "idle",
  processed: 0,
  total: 0,
  saved: 0,
  failed: 0,
  skipped: 0,
};
const MAX_BULK_RECORDS = 10000;

type BulkUploadStartOptions = {
  signatureId: string;
  modelId: string;
  signatureSchema: unknown;
};

export function useBulkPredictionUpload() {
  const [state, setState] = useState<BulkUploadState>(INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const queryClient = useQueryClient();

  const cancel = () => {
    abortRef.current?.abort();
  };

  const reset = () => {
    abortRef.current = null;
    setState(INITIAL_STATE);
  };

  const start = async (
    file: File,
    { signatureId, modelId, signatureSchema }: BulkUploadStartOptions,
  ) => {
    try {
      setState({ ...INITIAL_STATE, status: "parsing" });

      const lastPredictionId = await getLastPredictionId();
      const parsed = await parseSpreadsheetPredictionFile(
        file,
        signatureSchema,
        MAX_BULK_RECORDS,
        lastPredictionId,
      );
      const records: BulkPredictionRecord[] = parsed.records;
      const skipped: SkippedRecord[] = parsed.skipped;

      const skippedCount = skipped.length;
      if (skippedCount > 0) {
        for (const entry of skipped.slice(0, 5)) {
          toast.error(`Skipped line ${entry.line}${entry.name ? ` (${entry.name})` : ""}`, {
            description: entry.reason,
          });
        }
        if (skippedCount > 5) {
          toast.error(`…and ${skippedCount - 5} more skipped`);
        }
      }

      if (records.length === 0) {
        toast.error("No valid records found in file");
        setState({ ...INITIAL_STATE, status: "done", skipped: skippedCount });
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;
      const catalog = await loadPredictionCatalogDefinitions();

      setState({
        status: "processing",
        processed: 0,
        total: records.length,
        saved: 0,
        failed: 0,
        skipped: skippedCount,
      });

      let saved = 0;
      let failed = 0;

      for (let i = 0; i < records.length; i++) {
        if (controller.signal.aborted) {
          break;
        }

        const record = records[i];
        try {
          // react-doctor-disable-next-line react-doctor/async-await-in-loop -- Bulk upload is intentionally sequential for progress, cancellation, and backend load control.
          const prediction = await runBulkPredictionPipeline({
            schema: signatureSchema,
            modelId,
            inputs: record.inputs,
            customFieldDefinitions: catalog.fieldDefinitions,
            customReportDefinitions: catalog.reportDefinitions,
            customExplanationDefinitions: catalog.explanationDefinitions,
            signal: controller.signal,
          });
          const created = await createPrediction({
            signatureId,
            name: record.name,
            overwrite: false,
            inputs: record.inputs,
            prediction,
          });
          await Promise.all(
            derivePredictionTargets(prediction, signatureSchema).map((target) =>
              createTarget({
                predictionId: created.id,
                order: target.order,
                value: target.value,
              }),
            ),
          );
          saved++;
        } catch (error: unknown) {
          failed++;
          toast.error(`Failed: ${record.name}`, {
            description: error instanceof Error ? error.message : String(error),
          });
        }

        setState((prev) => ({
          ...prev,
          processed: i + 1,
          saved,
          failed,
        }));
      }

      setState((prev) => ({
        ...prev,
        status: "done",
        saved,
        failed,
      }));

      const cancelled = controller.signal.aborted;
      toast.success(
        `Bulk upload ${cancelled ? "cancelled" : "complete"}: ${saved} saved, ${failed} failed${skippedCount > 0 ? `, ${skippedCount} skipped` : ""}`,
      );

      queryClient.invalidateQueries({ queryKey: ["getPredictions"] });
    } catch (error: unknown) {
      setState(INITIAL_STATE);
      toast.error("Bulk upload could not start", {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      abortRef.current = null;
    }
  };

  return { ...state, start, cancel, reset };
}
