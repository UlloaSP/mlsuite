/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlRegistryPack } from "mlform/builtins";
import { registerDefinedFieldKind, registerDefinedReportKind } from "mlform/kit";
import type { PrimitiveDescriptorRegistry } from "mlform/primitives";
import type { FormSchema, Registry, Transport } from "mlform/runtime";
import type {
  CatalogFieldDefinition,
  CatalogReportDefinition,
} from "@/capabilities/prediction-runtime/plugins/plugin-catalog";
import { toMlformSchema } from "@/capabilities/prediction-runtime/mlform/schema-validation";
import type { PredictionPayloadField } from "@/capabilities/prediction-runtime/mlform/shared";
import { createSchemaRunTransport } from "@/capabilities/prediction-runtime/mlform/run-transport";
import { prepareRuntimeReports } from "@/capabilities/prediction-runtime/mlform/runtime-report-targets";

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
  fields.forEach((definition) =>
    registerDefinedFieldKind(pack.registry, pack.descriptorRegistry, definition.definition),
  );
  reports.forEach((definition) =>
    registerDefinedReportKind(pack.registry, pack.descriptorRegistry, definition.definition),
  );
  return pack;
};

export const createSchemaRunRuntime = ({
  schema,
  bindings,
  customFieldDefinitions = [],
  customReportDefinitions = [],
}: Options): SchemaRunRuntime => {
  const runtimeReports = prepareRuntimeReports(schema, bindings);
  const formSchema = toMlformSchema(runtimeReports, {
    customFieldDefinitions,
    customReportDefinitions,
  });
  const normalizedFields = formSchema.fields as PredictionPayloadField[];
  const pack = createRegistry(customFieldDefinitions, customReportDefinitions);
  return {
    formSchema,
    registry: pack.registry,
    descriptorRegistry: pack.descriptorRegistry,
    transport: createSchemaRunTransport(bindings, normalizedFields),
    normalizedFields,
  };
};
