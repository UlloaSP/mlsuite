/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlRegistryPack } from "mlform/builtins";
import { registerDefinedFieldKind, registerDefinedReportKind } from "mlform/kit";
import type { PrimitiveDescriptorRegistry } from "mlform/primitives";
import type { FormSchema, Registry, ReportConfig, Transport } from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../plugin/custom-field-catalog";
import type { CatalogReportDefinition } from "../../plugin/custom-report-catalog";
import { toMlformSchema } from "../../../algorithms/mlform/schema-validation";
import { isRecord, type PredictionPayloadField } from "../../../algorithms/mlform/shared";
import { createSchemaRunTransport } from "../../../algorithms/schema/run-transport";
import { wrapSchemaReportDefinitions } from "../../../algorithms/schema/report-plugin-context";
import { schemaRunDebug } from "../../../algorithms/schema/run-debug";
import { toMlformRuntimeSchema } from "../../../algorithms/mlform/schema-runtime-adapter";
import { mappedTarget, targetKey } from "../../../algorithms/mlform/mapped-to";

type Binding = {
  modelId: string;
  modelName?: string;
  pluginPolicy?: Record<string, unknown> | null;
};

type Options = {
  schema: unknown;
  bindings: readonly Binding[];
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

/**
 * SchemaRunRuntime: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: assembles schema-run MLForm schema, registries, descriptors, and transport.
 * @param fields - Input consumed by SchemaRunRuntime; uses the assembles schema-run MLForm schema, registries, descriptors, and transport contract.
 * @param reports - Input consumed by SchemaRunRuntime; uses the assembles schema-run MLForm schema, registries, descriptors, and transport contract.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: May create network-capable runtime objects; validation happens before requests where possible.
 */
export type SchemaRunRuntime = {
  formSchema: FormSchema;
  registry: Registry;
  descriptorRegistry: PrimitiveDescriptorRegistry;
  transport: Transport;
  normalizedFields: readonly PredictionPayloadField[];
};

/** createRegistry: internal transformation helper for schema composition, run, report, and feedback flow. @remarks Args: fields, reports; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const createRegistry = (
  fields: readonly CatalogFieldDefinition[],
  reports: readonly CatalogReportDefinition[],
) => {
  const pack = createMlRegistryPack();
  fields.forEach((definition) => {
    schemaRunDebug("runtime.register-field", { kind: definition.kind });
    registerDefinedFieldKind(pack.registry, pack.descriptorRegistry, definition.definition);
  });
  reports.forEach((definition) => {
    schemaRunDebug("runtime.register-report", { kind: definition.kind });
    registerDefinedReportKind(pack.registry, pack.descriptorRegistry, definition.definition);
  });
  return pack;
};

const reportBaseId = (report: Record<string, unknown>, index: number): string =>
  typeof report.id === "string" && report.id.trim()
    ? report.id
    : typeof report.label === "string" && report.label.trim()
      ? report.label
      : `report-${index + 1}`;

const reportLabel = (report: Record<string, unknown>, binding: Binding): string | undefined => {
  const label = typeof report.label === "string" ? report.label : undefined;
  const model = binding.modelName ?? binding.modelId;
  return label && model ? `${label} ${model}` : label;
};

const expandRuntimeReports = (schema: unknown, bindings: readonly Binding[]): unknown => {
  if (!isRecord(schema) || !Array.isArray(schema.reports) || bindings.length <= 1) return schema;
  const reports = schema.reports.flatMap((report, index) => {
    if (!isRecord(report) || !isRecord(report.mappedTo)) return [report];
    const targets = bindings
      .map((binding) => ({ binding, target: targetKey(mappedTarget(report.mappedTo, binding)) }))
      .filter((item): item is { binding: Binding; target: string } => item.target !== undefined);
    if (targets.length <= 1) return [report];
    const baseId = reportBaseId(report, index);
    return targets.map(({ binding, target }) => ({
      ...report,
      id: `${baseId}-${binding.modelId}`,
      label: reportLabel(report, binding),
      mappedTo: { [binding.modelName ?? binding.modelId]: target },
    }));
  });
  return { ...schema, reports };
};

/**
 * createSchemaRunRuntime: creates a configured runtime object or schema object
 *
 * Purpose: assembles schema-run MLForm schema, registries, descriptors, and transport.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Error when required schema/plugin/model mapping data is missing, malformed, or unsupported.
 * @remarks Side cases/effects: May create network-capable runtime objects; validation happens before requests where possible.
 */
export const createSchemaRunRuntime = ({
  schema,
  bindings,
  customFieldDefinitions = [],
  customReportDefinitions = [],
}: Options): SchemaRunRuntime => {
  schemaRunDebug("runtime.create.start", {
    bindings: bindings.length,
    customFields: customFieldDefinitions.map((definition) => definition.kind),
    customReports: customReportDefinitions.map((definition) => definition.kind),
  });
  const schemaReportDefinitions = wrapSchemaReportDefinitions(customReportDefinitions);
  const runtimeSchema = expandRuntimeReports(schema, bindings);
  const formSchema = toMlformSchema(toMlformRuntimeSchema(runtimeSchema), {
    customFieldDefinitions,
    customReportDefinitions: schemaReportDefinitions,
  });
  const normalizedFields = formSchema.fields as PredictionPayloadField[];
  schemaRunDebug("runtime.create.normalized-schema", {
    fields: formSchema.fields.length,
    reports: (formSchema.reports ?? []).map((report: ReportConfig) => ({
      id: report.id,
      kind: report.kind,
    })),
  });
  const pack = createRegistry(customFieldDefinitions, schemaReportDefinitions);
  return {
    formSchema,
    registry: pack.registry,
    descriptorRegistry: pack.descriptorRegistry,
    transport: createSchemaRunTransport(bindings, normalizedFields),
    normalizedFields,
  };
};
