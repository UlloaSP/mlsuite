/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { isRecord } from "../app/utils/mlform/shared";
import type { CreateSchemaVersionRequest, JsonRecord, SchemaVersionDto } from "./types";

export const rebaseSchemaVersionBindings = (
  composed: CreateSchemaVersionRequest,
  _editedSchema: JsonRecord,
): CreateSchemaVersionRequest["bindings"] => {
  return composed.bindings;
};

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
