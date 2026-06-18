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

/** transportFields: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const transportFields = (
  formSchema: FormSchema,
  sourceSchema: unknown,
): readonly PredictionPayloadField[] => {
  if (!isRecord(sourceSchema) || !Array.isArray(sourceSchema.fields)) {
    return formSchema.fields as PredictionPayloadField[];
  }
  const sourceFields = sourceSchema.fields;
  return formSchema.fields.map((field: unknown, index: number) => {
    const sourceField = sourceFields[index];
    if (!isRecord(sourceField)) return field as PredictionPayloadField;
    if (sourceField.kind === "onehot-category" && Array.isArray(sourceField.options)) {
      sourceField.options.forEach((option, optionIndex) => {
        if (isRecord(option) && option.mappedTo === undefined) {
          throw new Error(`Schema field ${index + 1} option ${optionIndex + 1} falta mappedTo`);
        }
      });
    } else if (sourceField.mappedTo === undefined) {
      throw new Error(`Schema field ${index + 1} falta mappedTo`);
    }
    const next: PredictionPayloadField = {
      ...(field as PredictionPayloadField),
      mappedTo: sourceField.mappedTo,
    };
    if (Array.isArray(sourceField.options)) next.options = sourceField.options;
    return next;
  });
};

/** reportMappings: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const reportMappings = (schema: unknown): readonly unknown[] => {
  if (!isRecord(schema) || !Array.isArray(schema.reports)) return [];
  const mappings: unknown[] = [];
  schema.reports.forEach((report, index) => {
    if (!isRecord(report)) return;
    if (report.mappedTo === undefined) {
      throw new Error(`Schema report ${index + 1} falta mappedTo`);
    }
    mappings.push(report.mappedTo);
  });
  return mappings;
};

/** restoreReportMappings: internal helper for schema composition, run, report, and feedback flow. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const restoreReportMappings = (
  formSchema: FormSchema,
  mappings: readonly unknown[],
): FormSchema => {
  if (mappings.length === 0 || !Array.isArray(formSchema.reports)) return formSchema;
  return {
    ...formSchema,
    reports: formSchema.reports.map((report: ReportConfig, index: number) => ({
      ...report,
      mappedTo: mappings[index],
    })),
  };
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
  const normalizedFormSchema = toMlformSchema(toMlformRuntimeSchema(schema), {
    customFieldDefinitions,
    customReportDefinitions: schemaReportDefinitions,
  });
  const mappings = reportMappings(schema);
  const formSchema = restoreReportMappings(normalizedFormSchema, mappings);
  const normalizedFields = transportFields(formSchema, schema);
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
    transport: createSchemaRunTransport(
      bindings,
      normalizedFields,
      schemaReportDefinitions,
      mappings,
    ),
    normalizedFields,
  };
};
