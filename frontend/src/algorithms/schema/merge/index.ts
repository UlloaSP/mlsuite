/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord, toUniqueId } from "../../../algorithms/mlform/shared";
import type { ModelDto } from "../../../models/api/modelService";
import { applyOneHotCategories } from "../one-hot-category";
import type { CreateSchemaVersionRequest, JsonRecord } from "../../../schemas/types";

export type SelectedSchemaModel = {
  modelId: string;
  modelName: string;
  model: ModelDto;
};

type CanonicalItem = {
  id: string;
  key: string | number;
  field: JsonRecord;
};

const normalize = (value: string): string => value.trim().toLowerCase();

const itemKey = (item: JsonRecord): string => {
  const label = getString(item.label) ?? getString(item.id) ?? "item";
  const kind = getString(item.kind) ?? "unknown";
  return `${normalize(label)}::${normalize(kind)}`;
};

const targetValue = (item: JsonRecord, path: string): string | number => {
  if (typeof item.mappedTo === "string" || typeof item.mappedTo === "number") {
    return item.mappedTo;
  }
  throw new Error(`${path} falta mappedTo`);
};

const bindingKey = (modelName: string): string => modelName;

const setMappedTo = (item: JsonRecord, key: string, target: string | number) => {
  item.mappedTo = { ...(isRecord(item.mappedTo) ? item.mappedTo : {}), [key]: target };
};

const canonicalReportTarget = (report: JsonRecord, path: string): string | number =>
  targetValue(report, path);

const reportLabel = (report: JsonRecord, modelId: string, index: number): string => {
  const label = getString(report.label) ?? getString(report.id) ?? `Report ${index + 1}`;
  return `${label} · ${modelId}`;
};

const createCanonical = (
  items: unknown,
  prefix: string,
): { canonical: JsonRecord[]; byKey: Map<string, CanonicalItem> } => {
  const usedIds = new Set<string>();
  const byKey = new Map<string, CanonicalItem>();
  const canonical: JsonRecord[] = [];
  if (!Array.isArray(items)) return { canonical, byKey };

  items.filter(isRecord).forEach((item, index) => {
    const key = itemKey(item);
    if (byKey.has(key)) return;
    const label = getString(item.label) ?? getString(item.id) ?? `${prefix}-${index + 1}`;
    const id = toUniqueId(label, `${prefix}-${index + 1}`, usedIds);
    const field = { ...item };
    delete field.id;
    byKey.set(key, { id, key: targetValue(item, `${prefix}-${index + 1}`), field });
    canonical.push(field);
  });
  return { canonical, byKey };
};

const addMissingCanonical = (
  canonical: JsonRecord[],
  byKey: Map<string, CanonicalItem>,
  sourceItems: unknown,
  prefix: string,
) => {
  const usedIds = new Set(canonical.map((item) => getString(item.id) ?? ""));
  if (!Array.isArray(sourceItems)) return;
  sourceItems.filter(isRecord).forEach((item, index) => {
    const key = itemKey(item);
    if (byKey.has(key)) return;
    const label = getString(item.label) ?? getString(item.id) ?? `${prefix}-${index + 1}`;
    const id = toUniqueId(label, `${prefix}-${index + 1}`, usedIds);
    const field = { ...item };
    delete field.id;
    byKey.set(key, { id, key: targetValue(item, `${prefix}-${index + 1}`), field });
    canonical.push(field);
  });
};

const addInputMappedTargets = (
  selected: readonly SelectedSchemaModel[],
  fieldsByKey: Map<string, CanonicalItem>,
) => {
  selected.forEach(({ modelId, modelName, model }) => {
    const modelKeyName = modelName ?? modelId;
    const fields = isRecord(model.inputSchema) ? model.inputSchema.fields : [];
    if (!Array.isArray(fields)) return;
    fields.filter(isRecord).forEach((field) => {
      const canonical = fieldsByKey.get(itemKey(field));
      if (canonical)
        setMappedTo(
          canonical.field,
          bindingKey(modelKeyName),
          targetValue(field, String(canonical.key)),
        );
    });
  });
};

const kindsFrom = (items: unknown): string[] =>
  Array.isArray(items)
    ? Array.from(new Set(items.filter(isRecord).flatMap((item) => getString(item.kind) ?? [])))
    : [];

const buildPluginPolicy = (model: ModelDto): JsonRecord => {
  const schema = isRecord(model.inputSchema) ? model.inputSchema : {};
  return {
    fieldKinds: kindsFrom(schema.fields),
    reportKinds: kindsFrom(schema.reports),
  };
};

const buildBindingReports = (selected: readonly SelectedSchemaModel[]): JsonRecord[] => {
  const reports: JsonRecord[] = [];
  selected.forEach(({ modelId, modelName, model }) => {
    const modelKeyName = modelName ?? modelId;
    const sourceReports = isRecord(model.inputSchema) ? model.inputSchema.reports : [];
    if (Array.isArray(sourceReports)) {
      sourceReports.filter(isRecord).forEach((report, index) => {
        const target = canonicalReportTarget(report, `report-${index + 1}`);
        const nextReport: JsonRecord = {
          ...report,
          label: reportLabel(report, modelKeyName, index),
          mappedTo: { [bindingKey(modelKeyName)]: target },
        };
        delete nextReport.id;
        delete nextReport.source;
        reports.push(nextReport);
      });
    }
  });
  return reports;
};

export const composeSchemaVersion = (
  name: string,
  selected: readonly SelectedSchemaModel[],
): CreateSchemaVersionRequest => {
  const firstSchema = selected[0]?.model.inputSchema;
  const firstFields = isRecord(firstSchema) ? firstSchema.fields : [];
  const fieldsState = createCanonical(firstFields, "field");

  selected.slice(1).forEach(({ model }) => {
    const schema = model.inputSchema;
    addMissingCanonical(
      fieldsState.canonical,
      fieldsState.byKey,
      isRecord(schema) ? schema.fields : [],
      "field",
    );
  });
  addInputMappedTargets(selected, fieldsState.byKey);
  const reports = buildBindingReports(selected);

  const formSchema = applyOneHotCategories({
    fields: fieldsState.canonical,
    reports,
  });

  return {
    name,
    formSchema,
    bindings: selected.map(({ modelId, modelName, model }) => ({
      modelId,
      modelName: modelName ?? modelId,
      pluginPolicy: buildPluginPolicy(model),
    })),
  };
};
