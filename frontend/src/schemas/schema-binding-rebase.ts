/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord, toUniqueId } from "../app/utils/mlform/shared";
import type { CreateSchemaVersionRequest, JsonRecord, SchemaVersionDto } from "./types";

const fieldKeysById = (schema: JsonRecord): Map<string, string> => {
  const fields = Array.isArray(schema.fields) ? schema.fields.filter(isRecord) : [];
  return new Map(
    fields.map((field) => [
      String(field.id ?? ""),
      getString(field.label) ?? String(field.id ?? ""),
    ]),
  );
};

export const rebaseSchemaVersionBindings = (
  composed: CreateSchemaVersionRequest,
  editedSchema: JsonRecord,
): CreateSchemaVersionRequest["bindings"] => {
  const originalKeys = fieldKeysById(composed.formSchema);
  const editedKeys = fieldKeysById(editedSchema);
  const keyMap = new Map(
    [...originalKeys.entries()].flatMap(([id, oldKey]) => {
      const nextKey = editedKeys.get(id);
      return nextKey ? [[oldKey, nextKey]] : [];
    }),
  );
  return composed.bindings.map((binding) => ({
    ...binding,
    inputMapping: Object.fromEntries(
      Object.entries(binding.inputMapping ?? {}).map(([oldKey, modelKey]) => [
        keyMap.get(oldKey) ?? oldKey,
        modelKey,
      ]),
    ),
  }));
};

const reportId = (report: JsonRecord): string => getString(report.id) ?? "";
const reportSource = (report: JsonRecord): string => getString(report.source) ?? reportId(report);
const reportLabel = (report: JsonRecord, modelId: string): string => {
  const label = (getString(report.label) ?? reportId(report)) || "Report";
  return label.includes(`· ${modelId}`) ? label : `${label} · ${modelId}`;
};

const addPolicyKind = (policy: unknown, kind: unknown): JsonRecord | undefined => {
  if (typeof kind !== "string") return isRecord(policy) ? policy : undefined;
  const current = isRecord(policy) ? policy : {};
  const reportKinds = Array.isArray(current.reportKinds)
    ? current.reportKinds.filter((item): item is string => typeof item === "string")
    : [];
  return { ...current, reportKinds: Array.from(new Set([...reportKinds, kind])) };
};

export const prepareSchemaVersionForSave = (
  composed: CreateSchemaVersionRequest,
  editedSchema: JsonRecord,
): CreateSchemaVersionRequest => {
  const boundIds = new Set(composed.bindings.flatMap((binding) => Object.keys(binding.outputMapping ?? {})));
  const reports = Array.isArray(editedSchema.reports) ? editedSchema.reports.filter(isRecord) : [];
  const usedIds = new Set<string>();
  const nextBindings = rebaseSchemaVersionBindings(composed, editedSchema).map((binding) => ({
    ...binding,
    outputMapping: { ...(binding.outputMapping ?? {}) },
  }));
  const nextReports = reports.flatMap((report) => {
    const id = reportId(report);
    if (boundIds.has(id)) {
      usedIds.add(id);
      return [report];
    }
    const source = reportSource(report);
    return nextBindings.map((binding) => {
      const nextId = toUniqueId(`${binding.modelId}-${binding.signatureId}-${source}`, "report", usedIds);
      binding.outputMapping[nextId] = source;
      binding.pluginPolicy = addPolicyKind(binding.pluginPolicy, report.kind);
      return { ...report, id: nextId, source: nextId, label: reportLabel(report, binding.modelId) };
    });
  });
  return { ...composed, formSchema: { ...editedSchema, reports: nextReports }, bindings: nextBindings };
};

export const prepareSchemaVersionDtoForUse = (version: SchemaVersionDto): SchemaVersionDto => {
  const prepared = prepareSchemaVersionForSave({
    name: version.name,
    formSchema: version.formSchema,
    bindings: version.bindings.map((binding) => ({
      modelId: binding.modelId,
      signatureId: binding.signatureId,
      inputMapping: binding.inputMapping,
      outputMapping: binding.outputMapping,
      pluginPolicy: binding.pluginPolicy ?? undefined,
    })),
  }, version.formSchema);
  return {
    ...version,
    formSchema: prepared.formSchema,
    bindings: version.bindings.map((binding, index) => ({
      ...binding,
      inputMapping: prepared.bindings[index]?.inputMapping ?? binding.inputMapping,
      outputMapping: prepared.bindings[index]?.outputMapping ?? binding.outputMapping,
      pluginPolicy: prepared.bindings[index]?.pluginPolicy ?? binding.pluginPolicy,
    })),
  };
};
