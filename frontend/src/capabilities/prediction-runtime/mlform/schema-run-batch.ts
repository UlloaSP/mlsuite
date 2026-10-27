/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { appFetch, json } from "@/shared/api/http";
import { retryWhileBusy } from "@/shared/api/busy-retry";
import type {
  WorkspacePredictionBatchDto,
  WorkspacePredictionBatchRequest,
  WorkspacePredictionDto,
} from "@/shared/api/openapi.gen";
import { applySchemaRunInputMapping } from "@/capabilities/prediction-runtime/mlform/model-input-mapping";
import type {
  SchemaRunBinding,
  SchemaRunTarget,
} from "@/capabilities/prediction-runtime/mlform/run-transport";
import type {
  JsonRecord,
  PredictionPayloadField,
} from "@/capabilities/prediction-runtime/mlform/shared";

/** The most records one batch carries (WorkspacePredictionBatchRequest's bound on the server). */
export const SCHEMA_RUN_BATCH_SIZE = 100;

const runBindingBatch = (
  target: SchemaRunTarget,
  binding: SchemaRunBinding,
  records: readonly JsonRecord[],
  fields: readonly PredictionPayloadField[],
  signal?: AbortSignal,
): Promise<WorkspacePredictionDto[]> => {
  const request: WorkspacePredictionBatchRequest = {
    schemaVersionId: target.schemaVersionId,
    modelId: binding.modelId,
    rows: records.map((record) => applySchemaRunInputMapping(record, fields, binding)),
  };
  return retryWhileBusy(
    () =>
      appFetch<WorkspacePredictionBatchDto>(
        `/api/schema-bookmarks/${encodeURIComponent(target.bookmarkId)}/predictions/batch`,
        { ...json("POST", request), signal },
      ),
    signal,
  ).then(({ results }) => {
    if (results.length !== records.length)
      throw new Error(`The server answered ${results.length} of ${records.length} records`);
    return results;
  });
};

/**
 * Runs a batch of records (at most {@link SCHEMA_RUN_BATCH_SIZE}) on every bound model, one
 * request per model, and answers each record's sealed results in binding order, as a single run
 * of that record would. A record a model refuses is a failed result; a batch the server refuses
 * fails as a whole.
 */
export async function runSchemaBatch(
  target: SchemaRunTarget,
  bindings: readonly SchemaRunBinding[],
  fields: readonly PredictionPayloadField[],
  records: readonly JsonRecord[],
  signal?: AbortSignal,
): Promise<WorkspacePredictionDto[][]> {
  const byBinding = await Promise.all(
    bindings.map((binding) => runBindingBatch(target, binding, records, fields, signal)),
  );
  return records.map((_, index) => byBinding.map((results) => results[index]!));
}
