/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import {
  createBuiltinRegistry,
  createForm,
  defineFieldDefinition,
  defineReportDefinition,
  type FieldConfig,
  type FieldDefinition,
  type FormSchema,
  type FormController,
  type Registry,
  type ReportConfig,
  type ReportDefinition,
  type Transport,
} from "mlform/engine";
import { CUSTOM_FIELD_COMPONENT, type CatalogFieldDefinition } from "./custom-field";
import type { CatalogExplanationDefinition } from "./custom-explanation";
import { CUSTOM_REPORT_COMPONENT, type CatalogReportDefinition } from "./custom-report";
import { toMlformSchema } from "./schema-validation";
import { type PredictionPayloadField, type PredictionTheme } from "./shared";
import { createPredictionTransport } from "./transport";

const wrapCustomFieldDefinition = (
  definition: CatalogFieldDefinition,
): FieldDefinition<FieldConfig, unknown> =>
  defineFieldDefinition({
    ...definition.definition,
    describe(config, context) {
      const descriptor = definition.definition.describe(config, context);
      if (descriptor.component !== CUSTOM_FIELD_COMPONENT) {
        throw new Error(
          `Custom field kind "${definition.kind}" must use shared renderer "${CUSTOM_FIELD_COMPONENT}".`,
        );
      }
      return descriptor;
    },
  });

const wrapCustomReportDefinition = (
  definition: CatalogReportDefinition,
): ReportDefinition<ReportConfig> =>
  defineReportDefinition({
    ...definition.definition,
    describe(config, context) {
      const descriptor = definition.definition.describe(config, context);
      if (descriptor && descriptor.component !== CUSTOM_REPORT_COMPONENT) {
        throw new Error(
          `Custom report kind "${definition.kind}" must use shared renderer "${CUSTOM_REPORT_COMPONENT}".`,
        );
      }
      return descriptor;
    },
  });

export const createPredictionEngineRegistry = (
  customFieldDefinitions: readonly CatalogFieldDefinition[],
  customReportDefinitions: readonly CatalogReportDefinition[],
  customExplanationDefinitions: readonly CatalogExplanationDefinition[],
) => {
  const engineRegistry = createBuiltinRegistry();
  for (const definition of customFieldDefinitions) {
    if (definition.active) {
      engineRegistry.registerField(wrapCustomFieldDefinition(definition));
    }
  }
  for (const definition of customReportDefinitions) {
    if (definition.active) {
      engineRegistry.registerReport(wrapCustomReportDefinition(definition));
    }
  }
  for (const definition of customExplanationDefinitions) {
    if (definition.active) {
      engineRegistry.registerExplanation(definition.definition);
    }
  }
  return engineRegistry;
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
  const registry = createPredictionEngineRegistry(
    customFieldDefinitions,
    customReportDefinitions,
    customExplanationDefinitions,
  );
  const transport = createPredictionTransport(modelId, normalizedFields);
  return { formSchema, registry, transport, normalizedFields };
};

export const getPredictionDesignSystem = (theme: PredictionTheme) => ({
  mode: theme,
  theme: "cobalt" as const,
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
