/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlRegistryPack } from "mlform/builtins";
import {
  registerDefinedFieldKind,
  registerDefinedReportKind,
} from "mlform/kit";
import type { PrimitiveDescriptorRegistry } from "mlform/primitives";
import {
  createForm,
  type FormController,
  type FormSchema,
  type Registry,
  type Transport,
} from "mlform/runtime";
import type { CatalogFieldDefinition } from "../../../plugin/mlform/custom-field";
import type { CatalogReportDefinition } from "../../../plugin/mlform/custom-report";
import { toMlformSchema } from "./schema-validation";
import { type PredictionPayloadField, type PredictionTheme } from "./shared";
import { createPredictionTransport } from "./transport";

const createPredictionEngineRegistry = (
  customFieldDefinitions: readonly CatalogFieldDefinition[],
  customReportDefinitions: readonly CatalogReportDefinition[],
) => {
  const pack = createMlRegistryPack();
  for (const definition of customFieldDefinitions) {
    registerDefinedFieldKind(pack.registry, pack.descriptorRegistry, definition.definition);
  }
  for (const definition of customReportDefinitions) {
    registerDefinedReportKind(pack.registry, pack.descriptorRegistry, definition.definition);
  }
  return pack;
};

type CreateHeadlessPredictionFormOptions = {
  schema: unknown;
  modelId: string;
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
};

export type PredictionRuntime = {
  formSchema: FormSchema;
  registry: Registry;
  descriptorRegistry: PrimitiveDescriptorRegistry;
  transport: Transport;
  normalizedFields: readonly PredictionPayloadField[];
};

export const createPredictionRuntime = ({
  schema,
  modelId,
  customFieldDefinitions = [],
  customReportDefinitions = [],
}: CreateHeadlessPredictionFormOptions): PredictionRuntime => {
  const formSchema = toMlformSchema(schema, {
    customFieldDefinitions,
    customReportDefinitions,
  });
  const normalizedFields = formSchema.fields as PredictionPayloadField[];
  const pack = createPredictionEngineRegistry(customFieldDefinitions, customReportDefinitions);
  const transport = createPredictionTransport(modelId, normalizedFields);
  return {
    formSchema,
    registry: pack.registry,
    descriptorRegistry: pack.descriptorRegistry,
    transport,
    normalizedFields,
  };
};

export const getPredictionDesignSystem = (theme: PredictionTheme) => ({
  mode: theme,
  theme: "airbnb" as const,
  recipe: "default" as const,
});

export const createHeadlessPredictionForm = (
  options: CreateHeadlessPredictionFormOptions,
): { form: FormController; normalizedFields: readonly PredictionPayloadField[] } => {
  const runtime = createPredictionRuntime(options);
  const form = createForm({
    schema: runtime.formSchema,
    registry: runtime.registry,
    transport: runtime.transport,
  });
  return { form, normalizedFields: runtime.normalizedFields };
};
