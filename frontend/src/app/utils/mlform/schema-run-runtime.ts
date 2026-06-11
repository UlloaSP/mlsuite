/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlRegistryPack } from "mlform/builtins";
import { registerDefinedFieldKind, registerDefinedReportKind } from "mlform/kit";
import type { PrimitiveDescriptorRegistry } from "mlform/primitives";
import type { FormSchema, Registry, Transport } from "mlform/runtime";
import type { CatalogFieldDefinition } from "./custom-field";
import type { CatalogReportDefinition } from "./custom-report";
import { toMlformSchema } from "./schema-validation";
import { isRecord, type PredictionPayloadField } from "./shared";
import { createSchemaRunTransport } from "./schema-run-transport";
import { buildSchemaRunReportUsages, toRuntimeReports } from "./schema-run-report-usages";
import { wrapSchemaReportDefinitions } from "./schema-report-plugin-context";
import { schemaRunDebug } from "./schema-run-debug";

type Binding = {
  modelId: string;
  signatureId: string;
  inputMapping?: Record<string, unknown>;
  outputMapping?: Record<string, unknown>;
  pluginPolicy?: Record<string, unknown> | null;
};

type Options = {
  schema: unknown;
  bindings: readonly Binding[];
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

export type SchemaRunRuntime = {
  formSchema: FormSchema;
  registry: Registry;
  descriptorRegistry: PrimitiveDescriptorRegistry;
  transport: Transport;
  normalizedFields: readonly PredictionPayloadField[];
};

const createRegistry = (
  fields: readonly CatalogFieldDefinition[],
  reports: readonly CatalogReportDefinition[],
) => {
  const pack = createMlRegistryPack();
  fields.forEach((definition) => {
    if (definition.active) {
      schemaRunDebug("runtime.register-field", { kind: definition.kind });
      registerDefinedFieldKind(pack.registry, pack.descriptorRegistry, definition.definition);
    }
  });
  reports.forEach((definition) => {
    if (definition.active) {
      schemaRunDebug("runtime.register-report", { kind: definition.kind });
      registerDefinedReportKind(pack.registry, pack.descriptorRegistry, definition.definition);
    }
  });
  return pack;
};

export const createSchemaRunRuntime = ({
  schema,
  bindings,
  customFieldDefinitions = [],
  customReportDefinitions = [],
}: Options): SchemaRunRuntime => {
  schemaRunDebug("runtime.create.start", {
    bindings: bindings.length,
    customFields: customFieldDefinitions.map(
      (definition) => `${definition.kind}:${definition.active}`,
    ),
    customReports: customReportDefinitions.map(
      (definition) => `${definition.kind}:${definition.active}`,
    ),
  });
  const schemaReportDefinitions = wrapSchemaReportDefinitions(customReportDefinitions);
  const formSchema = toMlformSchema(schema, {
    customFieldDefinitions,
    customReportDefinitions: schemaReportDefinitions,
  });
  const reportUsages = buildSchemaRunReportUsages(bindings, formSchema.reports ?? []);
  const mappedReportIds = new Set(reportUsages.map((usage) => usage.canonicalReportId));
  const unmappedReports = (formSchema.reports ?? []).filter(
    (report) =>
      isRecord(report) && typeof report.id === "string" && !mappedReportIds.has(report.id),
  );
  const runtimeReports = [...toRuntimeReports(reportUsages), ...unmappedReports];
  const normalizedFields = formSchema.fields as PredictionPayloadField[];
  schemaRunDebug("runtime.create.normalized-schema", {
    fields: formSchema.fields.length,
    reports: (formSchema.reports ?? []).map((report) => ({
      id: report.id,
      kind: report.kind,
      source: report.source,
    })),
    runtimeReports: runtimeReports.map((report) => ({
      id: report.id,
      kind: report.kind,
      source: report.source,
    })),
  });
  const pack = createRegistry(customFieldDefinitions, schemaReportDefinitions);
  return {
    formSchema: { ...formSchema, reports: runtimeReports },
    registry: pack.registry,
    descriptorRegistry: pack.descriptorRegistry,
    transport: createSchemaRunTransport(
      bindings,
      normalizedFields,
      schemaReportDefinitions,
      reportUsages,
    ),
    normalizedFields,
  };
};
