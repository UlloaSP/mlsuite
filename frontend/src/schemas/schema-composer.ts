/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getString, isRecord, toUniqueId } from "../app/utils/mlform/shared";
import type { SignatureDto } from "../models/api/modelService";
import { applyOneHotMappedCategories } from "./one-hot-schema";
import { reportContractFingerprint, reportSource } from "./schema-report-contract";
import type { CreateSchemaVersionRequest, JsonRecord } from "./types";

export type SelectedSchemaSignature = {
  modelId: string;
  signature: SignatureDto;
};

type CanonicalItem = {
  id: string;
  key: string;
};

const normalize = (value: string): string => value.trim().toLowerCase();

const itemKey = (item: JsonRecord): string => {
  const label = getString(item.label) ?? getString(item.id) ?? "item";
  const kind = getString(item.kind) ?? "unknown";
  return `${normalize(label)}::${normalize(kind)}`;
};

const featureKey = (item: JsonRecord, fallback: string): string =>
  getString(item.label) ?? getString(item.id) ?? fallback;

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
    const id = toUniqueId(getString(item.id) ?? label, `${prefix}-${index + 1}`, usedIds);
    byKey.set(key, { id, key: featureKey(item, label) });
    canonical.push({ ...item, id });
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
    const id = toUniqueId(getString(item.id) ?? label, `${prefix}-${index + 1}`, usedIds);
    byKey.set(key, { id, key: featureKey(item, label) });
    canonical.push({ ...item, id });
  });
};

const buildInputMapping = (signature: SignatureDto, fieldsByKey: Map<string, CanonicalItem>) => {
  const fields = isRecord(signature.inputSignature) ? signature.inputSignature.fields : [];
  return Array.isArray(fields)
    ? fields.filter(isRecord).reduce<JsonRecord>((mapping, field) => {
        if (getString(field.kind) === "mapped-category") return mapping;
        const canonical = fieldsByKey.get(itemKey(field));
        if (canonical) mapping[canonical.key] = featureKey(field, canonical.key);
        return mapping;
      }, {})
    : {};
};

const kindsFrom = (items: unknown): string[] =>
  Array.isArray(items)
    ? Array.from(new Set(items.filter(isRecord).flatMap((item) => getString(item.kind) ?? [])))
    : [];

const buildPluginPolicy = (signature: SignatureDto): JsonRecord => {
  const schema = isRecord(signature.inputSignature) ? signature.inputSignature : {};
  return {
    fieldKinds: kindsFrom(schema.fields),
    reportKinds: kindsFrom(schema.reports),
  };
};

const buildBindingReports = (
  selected: readonly SelectedSchemaSignature[],
): { reports: JsonRecord[]; mappings: JsonRecord[] } => {
  const usedIds = new Set<string>();
  const reportByFingerprint = new Map<string, string>();
  const reports: JsonRecord[] = [];
  const mappings: JsonRecord[] = [];
  selected.forEach(({ signature }) => {
    const outputMapping: JsonRecord = {};
    const sourceReports = isRecord(signature.inputSignature)
      ? signature.inputSignature.reports
      : [];
    if (Array.isArray(sourceReports)) {
      sourceReports.filter(isRecord).forEach((report, index) => {
        const sourceId = reportSource(report, `report-${index + 1}`);
        const fingerprint = reportContractFingerprint(report, sourceId);
        const existingId = reportByFingerprint.get(fingerprint);
        const id = existingId ?? toUniqueId(sourceId, "report", usedIds);
        outputMapping[id] = sourceId;
        if (existingId) return;
        reportByFingerprint.set(fingerprint, id);
        reports.push({ ...report, id, source: sourceId });
      });
    }
    mappings.push(outputMapping);
  });
  return { reports, mappings };
};

export const composeSchemaVersion = (
  name: string,
  selected: readonly SelectedSchemaSignature[],
): CreateSchemaVersionRequest => {
  const firstSchema = selected[0]?.signature.inputSignature;
  const firstFields = isRecord(firstSchema) ? firstSchema.fields : [];
  const fieldsState = createCanonical(firstFields, "field");

  selected.slice(1).forEach(({ signature }) => {
    const schema = signature.inputSignature;
    addMissingCanonical(
      fieldsState.canonical,
      fieldsState.byKey,
      isRecord(schema) ? schema.fields : [],
      "field",
    );
  });
  const bindingReports = buildBindingReports(selected);

  const formSchema = applyOneHotMappedCategories({
    fields: fieldsState.canonical,
    reports: bindingReports.reports,
  });

  return {
    name,
    formSchema,
    bindings: selected.map(({ modelId, signature }, index) => ({
      modelId,
      signatureId: signature.id,
      inputMapping: buildInputMapping(signature, fieldsState.byKey),
      outputMapping: bindingReports.mappings[index] ?? {},
      pluginPolicy: buildPluginPolicy(signature),
    })),
  };
};
