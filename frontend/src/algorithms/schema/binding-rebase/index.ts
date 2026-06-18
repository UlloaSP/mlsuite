/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord } from "../../../algorithms/mlform/shared";
import type {
  CreateSchemaVersionRequest,
  JsonRecord,
  SchemaVersionDto,
} from "../../../schemas/types";

/** rebaseSchemaVersionBindings: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const rebaseSchemaVersionBindings = (
  composed: CreateSchemaVersionRequest,
  _editedSchema: JsonRecord,
): CreateSchemaVersionRequest["bindings"] => {
  return composed.bindings;
};

/**
 * prepareSchemaVersionForSave: performs the exported transformation for this algorithm.
 *
 * Purpose: rebases schema version binding records before save and after DTO load.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const prepareSchemaVersionForSave = (
  composed: CreateSchemaVersionRequest,
  editedSchema: JsonRecord,
): CreateSchemaVersionRequest => {
  const reports = Array.isArray(editedSchema.reports) ? editedSchema.reports.filter(isRecord) : [];
  const nextBindings = rebaseSchemaVersionBindings(composed, editedSchema).map((binding) => ({
    ...binding,
  }));
  const nextReports = reports.map((report, index) => {
    if (!isRecord(report.mappedTo)) throw new Error(`Schema report ${index + 1} falta mappedTo`);
    const nextReport = { ...report };
    delete nextReport.id;
    delete nextReport.source;
    return nextReport;
  });
  return {
    ...composed,
    formSchema: { ...editedSchema, reports: nextReports },
    bindings: nextBindings,
  };
};

/**
 * prepareSchemaVersionDtoForUse: performs the exported transformation for this algorithm.
 *
 * Purpose: rebases schema version binding records before save and after DTO load.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const prepareSchemaVersionDtoForUse = (version: SchemaVersionDto): SchemaVersionDto => {
  const prepared = prepareSchemaVersionForSave(
    {
      name: version.name,
      formSchema: version.formSchema,
      bindings: version.bindings.map((binding) => ({
        modelId: binding.modelId,
        modelName: binding.modelName,
        pluginPolicy: binding.pluginPolicy ?? undefined,
      })),
    },
    version.formSchema,
  );
  return {
    ...version,
    formSchema: prepared.formSchema,
    bindings: version.bindings.map((binding, index) => ({
      ...binding,
      pluginPolicy: prepared.bindings[index]?.pluginPolicy ?? binding.pluginPolicy,
    })),
  };
};
