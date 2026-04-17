/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { mountForm } from "mlform";
import type { AfterSubmitContext, SubmitErrorContext } from "mlform/engine";
import { createPredictionPrimitiveRegistry } from "./primitive-registry";
import { ensureExplanationReportInSchema, toMlformSchema } from "./schema";
import { createPredictionTransport } from "./transport";
import {
	type MountedPredictionForm,
	type MountPredictionFormOptions,
	type PredictionPayloadField,
	getBackendKey,
	isRecord,
} from "./shared";

export const mountPredictionForm = ({
	container,
	schema,
	modelId,
	theme,
	onSubmit,
	onSubmitError,
}: MountPredictionFormOptions): MountedPredictionForm => {
	const formSchema = toMlformSchema(ensureExplanationReportInSchema(schema));
	const normalizedFields = formSchema.fields as PredictionPayloadField[];
	const mounted = mountForm(container, {
		schema: formSchema,
		primitiveRegistry: createPredictionPrimitiveRegistry(modelId, normalizedFields),
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
