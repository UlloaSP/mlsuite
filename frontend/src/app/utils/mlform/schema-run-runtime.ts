/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlRegistryPack } from "mlform/builtins";
import { registerDefinedFieldKind, registerDefinedReportKind } from "mlform/kit";
import type { PrimitiveDescriptorRegistry } from "mlform/primitives";
import type { FormSchema, Registry, ReportConfig, Transport } from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../../plugin/mlform/custom-field";
import type { CatalogReportDefinition } from "../../../plugin/mlform/custom-report";
import { toMlformSchema } from "./schema-validation";
import { isRecord, type PredictionPayloadField } from "./shared";
import { createSchemaRunTransport } from "./schema-run-transport";
import { wrapSchemaReportDefinitions } from "./schema-report-plugin-context";
import { schemaRunDebug } from "./schema-run-debug";
import { toMlformRuntimeSchema } from "./schema-runtime-adapter";

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
    schemaRunDebug("runtime.register-field", { kind: definition.kind });
    registerDefinedFieldKind(pack.registry, pack.descriptorRegistry, definition.definition);
  });
  reports.forEach((definition) => {
    schemaRunDebug("runtime.register-report", { kind: definition.kind });
    registerDefinedReportKind(pack.registry, pack.descriptorRegistry, definition.definition);
  });
  return pack;
};

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

const reportMappings = (schema: unknown): readonly unknown[] => {
  if (!isRecord(schema) || !Array.isArray(schema.reports)) return [];
  return schema.reports.filter(isRecord).map((report, index) => {
    if (report.mappedTo === undefined) {
      throw new Error(`Schema report ${index + 1} falta mappedTo`);
    }
    return report.mappedTo;
  });
};

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
  const formSchema = toMlformSchema(toMlformRuntimeSchema(schema), {
    customFieldDefinitions,
    customReportDefinitions: schemaReportDefinitions,
  });
  const mappings = reportMappings(schema);
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
