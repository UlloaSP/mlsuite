/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { createMlRegistryPack } from "mlform/builtins-ml";
import {
  registerDefinedExplanationKind,
  registerDefinedFieldKind,
  registerDefinedReportKind,
  type PresentationRegistry,
} from "mlform/presentation";
import {
  createForm,
  type FormController,
  type FormSchema,
  type Registry,
  type Transport,
} from "mlform/runtime";
import type { CatalogExplanationDefinition } from "./custom-explanation";
import type { CatalogFieldDefinition } from "./custom-field";
import type { CatalogReportDefinition } from "./custom-report";
import { toMlformSchema } from "./schema-validation";
import { type PredictionPayloadField, type PredictionTheme } from "./shared";
import { createPredictionTransport } from "./transport";

const createPredictionEngineRegistry = (
  customFieldDefinitions: readonly CatalogFieldDefinition[],
  customReportDefinitions: readonly CatalogReportDefinition[],
  customExplanationDefinitions: readonly CatalogExplanationDefinition[],
) => {
  const pack = createMlRegistryPack();
  for (const definition of customFieldDefinitions) {
    if (definition.active) {
      registerDefinedFieldKind(pack.registry, pack.presentationRegistry, definition.definition);
    }
  }
  for (const definition of customReportDefinitions) {
    if (definition.active) {
      registerDefinedReportKind(pack.registry, pack.presentationRegistry, definition.definition);
    }
  }
  for (const definition of customExplanationDefinitions) {
    if (definition.active) {
      registerDefinedExplanationKind(
        pack.registry,
        pack.presentationRegistry,
        definition.definition,
      );
    }
  }
  return pack;
};

type CreateHeadlessPredictionFormOptions = {
  schema: unknown;
  modelId: string;
  customFieldDefinitions?: readonly CatalogFieldDefinition[];
  customReportDefinitions?: readonly CatalogReportDefinition[];
  customExplanationDefinitions?: readonly CatalogExplanationDefinition[];
};

export type PredictionRuntime = {
  formSchema: FormSchema;
  registry: Registry;
  presentationRegistry: PresentationRegistry;
  transport: Transport;
  normalizedFields: readonly PredictionPayloadField[];
};

export const createPredictionRuntime = ({
  schema,
  modelId,
  customFieldDefinitions = [],
  customReportDefinitions = [],
  customExplanationDefinitions = [],
}: CreateHeadlessPredictionFormOptions): PredictionRuntime => {
  const formSchema = toMlformSchema(schema, {
    customFieldDefinitions,
    customReportDefinitions,
    customExplanationDefinitions,
  });
  const normalizedFields = formSchema.fields as PredictionPayloadField[];
  const pack = createPredictionEngineRegistry(
    customFieldDefinitions,
    customReportDefinitions,
    customExplanationDefinitions,
  );
  const transport = createPredictionTransport(modelId, normalizedFields);
  return {
    formSchema,
    registry: pack.registry,
    presentationRegistry: pack.presentationRegistry,
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
