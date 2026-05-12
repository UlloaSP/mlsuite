/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform";
import {
	type AfterSubmitContext,
	type SubmitErrorContext,
} from "mlform/engine";
import {
	createPredictionRuntime,
	getPredictionDesignSystem,
} from "./headless-prediction";
import { createPredictionPrimitiveRegistry } from "./primitive-registry";
import {
	type MountedPredictionForm,
	type MountPredictionFormOptions,
	getBackendKey,
	isRecord,
} from "./shared";

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
	const runtime = createPredictionRuntime({
		schema,
		modelId,
		customFieldDefinitions,
		customReportDefinitions,
		customExplanationDefinitions,
	});
	const mounted = mountForm(container, {
		schema: runtime.formSchema,
		registry: runtime.registry,
		primitiveRegistry: createPredictionPrimitiveRegistry(),
		transport: runtime.transport,
		hooks: {
			afterSubmit({ result }: AfterSubmitContext) {
				onSubmit?.(
					Object.fromEntries(
						runtime.normalizedFields
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
			form: "Schema Inputs",
			reports: "Prediction Output",
			submit: "Run Prediction",
			validating: "Checking schema...",
			submitting: "Running model...",
		},
		designSystem: getPredictionDesignSystem(theme),
	});

	return {
		form: mounted.form,
		host: mounted.host,
		updateTheme(nextTheme) {
			mounted.replaceDesignSystem(getPredictionDesignSystem(nextTheme));
		},
		unmount() {
			mounted.unmount();
		},
	};
};
