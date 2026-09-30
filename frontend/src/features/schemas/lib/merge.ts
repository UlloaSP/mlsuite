/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord } from "@/capabilities/prediction-runtime/mlform/shared";
import { applyOneHotCategories } from "@/features/schemas/lib/one-hot-category";
import type { JsonRecord } from "@/features/schemas/api/schema-types";
import type { CreateSchemaVersionRequest, ModelDto } from "@/shared/api/openapi.gen";

export type SchemaSourceModel = Pick<
  ModelDto,
  "id" | "name" | "type" | "specificType" | "inputSchema"
>;

type CanonicalItem = {
  key: string | number | null;
  field: JsonRecord;
};

const normalize = (value: string): string => value.trim().toLowerCase();

const itemKey = (item: JsonRecord): string => {
  const label = getString(item.label) ?? getString(item.id) ?? "item";
  const kind = getString(item.kind) ?? "unknown";
  return `${normalize(label)}::${normalize(kind)}`;
};

const isOneHotCategory = (item: JsonRecord): boolean =>
  getString(item.kind) === "onehot-category" && Array.isArray(item.options);

const optionKey = (option: JsonRecord, fallback: string): string =>
  getString(option.value) ?? getString(option.label) ?? fallback;

const cloneField = (item: JsonRecord): JsonRecord => {
  const field = { ...item };
  if (Array.isArray(item.options)) {
    field.options = item.options.flatMap((option) => (isRecord(option) ? [{ ...option }] : []));
  }
  delete field.id;
  return field;
};

const targetValue = (item: JsonRecord, path: string): string | number => {
  if (typeof item.mappedTo === "string" || typeof item.mappedTo === "number") {
    return item.mappedTo;
  }
  throw new Error(`${path} falta mappedTo`);
};

const setMappedTo = (item: JsonRecord, key: string, target: string | number) => {
  item.mappedTo = { ...(isRecord(item.mappedTo) ? item.mappedTo : {}), [key]: target };
};

const mergeOneHotMappedTargets = (
  targetField: JsonRecord,
  sourceField: JsonRecord,
  binding: string,
) => {
  if (!Array.isArray(targetField.options) || !Array.isArray(sourceField.options)) return;
  const targetOptionsRaw = targetField.options;
  const byKey = new Map<string, JsonRecord>();
  targetOptionsRaw.forEach((option, index) => {
    if (isRecord(option)) byKey.set(optionKey(option, String(index)), option);
  });
  sourceField.options.forEach((sourceOption, index) => {
    if (!isRecord(sourceOption)) return;
    const target = targetValue(sourceOption, `option-${index + 1}`);
    const key = optionKey(sourceOption, String(index));
    let targetOption = byKey.get(key);
    if (!targetOption) {
      targetOption = { ...sourceOption };
      targetOptionsRaw.push(targetOption);
      byKey.set(key, targetOption);
    }
    setMappedTo(targetOption, binding, target);
  });
};

const reportLabel = (report: JsonRecord, modelName: string, index: number): string => {
  const label = getString(report.label) ?? getString(report.id) ?? `Report ${index + 1}`;
  return `${label} · ${modelName}`;
};

const collectCanonicalFields = (models: readonly SchemaSourceModel[]) => {
  const byKey = new Map<string, CanonicalItem>();
  const canonical: JsonRecord[] = [];
  models.forEach(({ inputSchema }) => {
    const items = isRecord(inputSchema) ? inputSchema.fields : [];
    if (!Array.isArray(items)) return;
    items.forEach((item, index) => {
      if (!isRecord(item)) return;
      const key = itemKey(item);
      if (byKey.has(key)) return;
      const field = cloneField(item);
      byKey.set(key, {
        key: isOneHotCategory(item) ? null : targetValue(item, `field-${index + 1}`),
        field,
      });
      canonical.push(field);
    });
  });
  return { canonical, byKey };
};

const addInputMappedTargets = (
  models: readonly SchemaSourceModel[],
  fieldsByKey: Map<string, CanonicalItem>,
) => {
  models.forEach((model) => {
    const fields = isRecord(model.inputSchema) ? model.inputSchema.fields : [];
    if (!Array.isArray(fields)) return;
    fields.forEach((field) => {
      if (!isRecord(field)) return;
      const canonical = fieldsByKey.get(itemKey(field));
      if (canonical && isOneHotCategory(field)) {
        mergeOneHotMappedTargets(canonical.field, field, model.name);
        return;
      }
      if (canonical)
        setMappedTo(canonical.field, model.name, targetValue(field, String(canonical.key)));
    });
  });
};

const kindsFrom = (items: unknown): string[] => {
  const kinds = new Set<string>();
  if (!Array.isArray(items)) return [];
  for (const item of items) {
    if (!isRecord(item)) continue;
    const kind = getString(item.kind);
    if (kind) kinds.add(kind);
  }
  return Array.from(kinds);
};

const buildPluginPolicy = (model: SchemaSourceModel): JsonRecord => {
  const schema = isRecord(model.inputSchema) ? model.inputSchema : {};
  return {
    fieldKinds: kindsFrom(schema.fields),
    reportKinds: kindsFrom(schema.reports),
  };
};

const buildBindingReports = (models: readonly SchemaSourceModel[]): JsonRecord[] => {
  const reports: JsonRecord[] = [];
  models.forEach((model) => {
    const sourceReports = isRecord(model.inputSchema) ? model.inputSchema.reports : [];
    if (Array.isArray(sourceReports)) {
      sourceReports.forEach((report, index) => {
        if (!isRecord(report)) return;
        const target = targetValue(report, `report-${index + 1}`);
        const nextReport: JsonRecord = {
          ...report,
          label: reportLabel(report, model.name, index),
          mappedTo: { [model.name]: target },
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
  models: readonly SchemaSourceModel[],
): CreateSchemaVersionRequest => {
  const fields = collectCanonicalFields(models);
  addInputMappedTargets(models, fields.byKey);
  return {
    name,
    formSchema: applyOneHotCategories({
      fields: fields.canonical,
      reports: buildBindingReports(models),
    }),
    bindings: models.map((model) => ({
      modelId: model.id,
      modelName: model.name,
      pluginPolicy: buildPluginPolicy(model),
    })),
  };
};
