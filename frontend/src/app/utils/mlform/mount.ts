/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform";
import {
	createBuiltinRegistry,
	defineFieldDefinition,
	defineReportDefinition,
	type AfterSubmitContext,
	type FieldConfig,
	type FieldDefinition,
	type ReportConfig,
	type ReportDefinition,
	type SubmitErrorContext,
} from "mlform/engine";
import {
	CUSTOM_FIELD_COMPONENT,
	type CatalogFieldDefinition,
} from "./custom-field";
import {
	type CatalogExplanationDefinition,
} from "./custom-explanation";
import {
	CUSTOM_REPORT_COMPONENT,
	type CatalogReportDefinition,
} from "./custom-report";
import { createPredictionPrimitiveRegistry } from "./primitive-registry";
import { filterInactiveCustomDefinitionsFromSchema, toMlformSchema } from "./schema";
import { createPredictionTransport } from "./transport";
import {
	type MountedPredictionForm,
	type MountPredictionFormOptions,
	type PredictionPayloadField,
	getBackendKey,
	isRecord,
} from "./shared";

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

const createPredictionEngineRegistry = (
	customFieldDefinitions: readonly CatalogFieldDefinition[],
	customReportDefinitions: readonly CatalogReportDefinition[],
	customExplanationDefinitions: readonly CatalogExplanationDefinition[],
) => {
	const engineRegistry = createBuiltinRegistry();

	for (const definition of customFieldDefinitions) {
		if (!definition.active) {
			continue;
		}

		engineRegistry.registerField(wrapCustomFieldDefinition(definition));
	}

	for (const definition of customReportDefinitions) {
		if (!definition.active) {
			continue;
		}

		engineRegistry.registerReport(wrapCustomReportDefinition(definition));
	}

	for (const definition of customExplanationDefinitions) {
		if (!definition.active) {
			continue;
		}

		engineRegistry.registerExplanation(definition.definition);
	}

	return engineRegistry;
};

export const mountPredictionForm = ({
	container,
	schema,
	modelId,
	theme,
	customFieldDefinitions = [],
	customReportDefinitions = [],
	customExplanationDefinitions = [],
	onSubmit,
	onSubmitError,
}: MountPredictionFormOptions): MountedPredictionForm => {
	const normalizedSchema = toMlformSchema(schema, {
		customFieldDefinitions,
		customReportDefinitions,
		customExplanationDefinitions,
	});
	const formSchema = filterInactiveCustomDefinitionsFromSchema(
		normalizedSchema,
		customFieldDefinitions,
		customReportDefinitions,
		customExplanationDefinitions,
	);
	const normalizedFields = formSchema.fields as PredictionPayloadField[];
	const mounted = mountForm(container, {
		schema: formSchema,
		registry: createPredictionEngineRegistry(
			customFieldDefinitions,
			customReportDefinitions,
			customExplanationDefinitions,
		),
		primitiveRegistry: createPredictionPrimitiveRegistry(),
		transport: createPredictionTransport(modelId, normalizedFields),
		hooks: {
			afterSubmit({ result }: AfterSubmitContext) {
				onSubmit?.(
					Object.fromEntries(
						normalizedFields
							.filter((field) => field.id in result.serializedValues)
							.map((field) => [getBackendKey(field), result.serializedValues[field.id]]),
					),
					isRecord(result.raw) ? result.raw : { raw: result.raw },
				);
			},
			onSubmitError({ error }: SubmitErrorContext) {
				onSubmitError?.(error);
			},
		},
		layout: "split",
		reportPane: "always",
		labels: {
			form: "Signature Inputs",
			reports: "Prediction Output",
			submit: "Run Prediction",
			validating: "Checking signature...",
			submitting: "Running model...",
		},
		designSystem: {
			mode: theme,
			theme: "cobalt",
			recipe: "default",
		},
	});

	return {
		form: mounted.form,
		host: mounted.host,
		updateTheme(nextTheme) {
			mounted.replaceDesignSystem({
				mode: nextTheme,
				theme: "cobalt",
				recipe: "default",
			});
		},
		unmount() {
			mounted.unmount();
		},
	};
};
