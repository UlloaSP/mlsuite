/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord, toUniqueId } from "../../../algorithms/mlform/shared";
import type { ModelDto } from "../../../api/models/services";
import { applyOneHotCategories } from "../one-hot-category";
import type { CreateSchemaVersionRequest, JsonRecord } from "../../../api/schemas/dtos";

/**
 * SelectedSchemaModel: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: merges selected model signatures into one schema version.
 * @param item - Input consumed by SelectedSchemaModel; uses the merges selected model signatures into one schema version contract.
 * @param key - Input consumed by SelectedSchemaModel; uses the merges selected model signatures into one schema version contract.
 * @param target - Input consumed by SelectedSchemaModel; uses the merges selected model signatures into one schema version contract.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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

/** normalize: internal normalization helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const normalize = (value: string): string => value.trim().toLowerCase();

/** itemKey: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const itemKey = (item: JsonRecord): string => {
  const label = getString(item.label) ?? getString(item.id) ?? "item";
  const kind = getString(item.kind) ?? "unknown";
  return `${normalize(label)}::${normalize(kind)}`;
};

/** targetValue: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const targetValue = (item: JsonRecord, path: string): string | number => {
  if (typeof item.mappedTo === "string" || typeof item.mappedTo === "number") {
    return item.mappedTo;
  }
  throw new Error(`${path} falta mappedTo`);
};

/** bindingKey: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const bindingKey = (modelName: string): string => modelName;

/** setMappedTo: internal transformation helper for schema composition, run, report, and feedback flow. @remarks Args: item, key, target; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const setMappedTo = (item: JsonRecord, key: string, target: string | number) => {
  item.mappedTo = { ...(isRecord(item.mappedTo) ? item.mappedTo : {}), [key]: target };
};

/** canonicalReportTarget: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const canonicalReportTarget = (report: JsonRecord, path: string): string | number =>
  targetValue(report, path);

/** reportLabel: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportLabel = (report: JsonRecord, modelId: string, index: number): string => {
  const label = getString(report.label) ?? getString(report.id) ?? `Report ${index + 1}`;
  return `${label} · ${modelId}`;
};

/** createCanonical: internal transformation helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/** addMissingCanonical: internal transformation helper for schema composition, run, report, and feedback flow. @remarks Args: canonical, byKey, CanonicalItem, sourceItems, prefix; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/** addInputMappedTargets: internal transformation helper for schema composition, run, report, and feedback flow. @remarks Args: selected, fieldsByKey, CanonicalItem; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/** kindsFrom: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const kindsFrom = (items: unknown): string[] =>
  Array.isArray(items)
    ? Array.from(new Set(items.filter(isRecord).flatMap((item) => getString(item.kind) ?? [])))
    : [];

/** buildPluginPolicy: internal transformation helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const buildPluginPolicy = (model: ModelDto): JsonRecord => {
  const schema = isRecord(model.inputSchema) ? model.inputSchema : {};
  return {
    fieldKinds: kindsFrom(schema.fields),
    reportKinds: kindsFrom(schema.reports),
  };
};

/** buildBindingReports: internal transformation helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
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

/**
 * composeSchemaVersion: performs the exported transformation for this algorithm.
 *
 * Purpose: merges selected model signatures into one schema version.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
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
