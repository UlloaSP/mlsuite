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
import type { PredictionPayloadField } from "./shared";
import { createSchemaRunTransport } from "./schema-run-transport";
import { wrapSchemaReportDefinitions } from "./schema-report-plugin-context";

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
    if (definition.active) registerDefinedFieldKind(pack.registry, pack.descriptorRegistry, definition.definition);
  });
  reports.forEach((definition) => {
    if (definition.active) registerDefinedReportKind(pack.registry, pack.descriptorRegistry, definition.definition);
  });
  return pack;
};

export const createSchemaRunRuntime = ({
  schema,
  bindings,
  customFieldDefinitions = [],
  customReportDefinitions = [],
}: Options): SchemaRunRuntime => {
  const schemaReportDefinitions = wrapSchemaReportDefinitions(customReportDefinitions);
  const formSchema = toMlformSchema(schema, {
    customFieldDefinitions,
    customReportDefinitions: schemaReportDefinitions,
  });
  const normalizedFields = formSchema.fields as PredictionPayloadField[];
  const pack = createRegistry(customFieldDefinitions, schemaReportDefinitions);
  return {
    formSchema,
    registry: pack.registry,
    descriptorRegistry: pack.descriptorRegistry,
    transport: createSchemaRunTransport(bindings, normalizedFields, schemaReportDefinitions),
    normalizedFields,
  };
};
