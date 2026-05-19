/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, it } from "vite-plus/test";
import type { ExplanationFetchRequest } from "mlform/runtime";
import { extractPredictionExplanationEntries } from "../src/models/explanation-feedback-utils";
import { applyExplanationFeedbackMetadata } from "../src/models/signature-feedback-metadata";
import type { CatalogExplanationDefinition } from "../src/app/utils/mlform/custom-explanation";
import {
	patchDefinedExplanationTransport,
	type ExplanationDefinitionWithFeedback,
} from "../src/app/utils/mlform/custom-explanation-questionnaire";
import { createPredictionTransport } from "../src/app/utils/mlform/transport";
import {
	buildCombinedReviewQuestionnaire,
	buildReviewFeedbackSteps,
	valuesForStep,
} from "../src/review/components/reviewCombinedQuestionnaire";

const questionnaire = {
	steps: [{
		id: "explanation-feedback",
		title: "Explanation Feedback",
		fields: [{ kind: "rating", id: "clarity", label: "Clarity", max: 5 }],
	}],
};

const definition: CatalogExplanationDefinition = {
	id: "plugin-1",
	fileName: "crystal-tree.ts",
	source: "",
	updatedAt: "2026-01-01T00:00:00Z",
	createdAt: "2026-01-01T00:00:00Z",
	contentType: "text/typescript",
	sizeBytes: 100,
	active: true,
	kind: "Crystal Tree",
	definition: {
		kind: "Crystal Tree",
		feedbackQuestionnaire: questionnaire,
		schema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
		transport: () => ({ submit: async () => ({}) }),
		describe: () => null,
	},
};

const predictionValue = {
	reports: {
		"crystal-tree": {
			explanations: ["Predicted class 2 || petal_length > 4.8"],
		},
	},
};

const explanationRequest: ExplanationFetchRequest = {
	explanationId: "crystal-tree",
	values: { "petal length": 4.9 },
	fieldValues: { "petal length": 4.9 },
	serializedValues: { "petal length": 4.9 },
	serializedFieldValues: { "petal length": 4.9 },
	reports: {},
	meta: {
		backendFieldValues: {
			petal_length: 4.9,
			petal_width: 1.5,
			sepal_length: 6.1,
			sepal_width: 2.8,
		},
	},
	raw: null,
};

const parsePostedData = async (body: BodyInit | null | undefined): Promise<Record<string, unknown>> => {
	expect(body).toBeInstanceOf(FormData);
	const data = (body as FormData).get("data");
	expect(data).toBeInstanceOf(File);
	return JSON.parse(await (data as File).text()) as Record<string, unknown>;
};

describe("explanation feedback metadata", () => {
	it("omits mapped-category parent controls from analyzer payload", async () => {
		let posted: Record<string, unknown> | null = null;
		const originalFetch = globalThis.fetch;
		globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
			posted = await parsePostedData(init?.body);
			return new Response(JSON.stringify({ outputs: [] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		}) as typeof fetch;

		try {
			await createPredictionTransport("demo", [
				{
					id: "rec-vhc",
					kind: "mapped-category",
					label: "rec_vhc",
					options: [{ mapping: { "rec-vhc-0-0": "1", "rec-vhc-1-0": "0" } }],
				},
				{ id: "rec-vhc-0-0", kind: "text", label: "rec_vhc__0.0" },
				{ id: "rec-vhc-1-0", kind: "text", label: "rec_vhc__1.0" },
			]).submit({
				values: {},
				fieldValues: {},
				serializedValues: {
					"rec-vhc": "0.0",
					"rec-vhc-0-0": "1",
					"rec-vhc-1-0": "0",
				},
				serializedFieldValues: {},
				fields: [],
				reports: [],
			});
		} finally {
			globalThis.fetch = originalFetch;
		}

		expect(posted).toEqual({
			"rec_vhc__0.0": "1",
			"rec_vhc__1.0": "0",
		});
	});

	it("sends backend feature keys through MLForm 0.1.9 defined explanation plugins", async () => {
		let captured: ExplanationFetchRequest | null = null;
		const plugin = patchDefinedExplanationTransport({
			kind: "Crystal Tree",
			schema: { safeParse: (value: unknown) => ({ success: true, data: value }) },
			transport: () => ({
				submit: async (request) => {
					captured = request;
					return {};
				},
			}),
			describe: () => null,
			definition: null as never,
			presenter: null as never,
		} satisfies ExplanationDefinitionWithFeedback);
		plugin.definition = {
			kind: plugin.kind,
			schema: plugin.schema,
			transport: plugin.transport,
		};
		await plugin.definition.transport({ kind: "Crystal Tree" }).submit(explanationRequest);

		expect(captured?.serializedValues).toEqual(explanationRequest.meta.backendFieldValues);
	});

	it("persists plugin questionnaire metadata into schema explanations", () => {
		const schema = applyExplanationFeedbackMetadata({
			fields: [{ kind: "number", label: "petal_length" }],
			explanations: [{ kind: "Crystal Tree", id: "crystal-tree" }],
		}, [definition]);

		const explanation = (schema.explanations as Record<string, unknown>[])[0];

		expect(explanation.feedbackEnabled).toBe(true);
		expect(explanation.feedbackQuestionnaire).toEqual(questionnaire);
	});

	it("detects embedded questionnaire without loading plugin catalog", () => {
		const entries = extractPredictionExplanationEntries(
			predictionValue,
			{
				fields: [{ kind: "number", label: "petal_length" }],
				explanations: [{
					kind: "Crystal Tree",
					id: "crystal-tree",
					feedbackQuestionnaire: questionnaire,
				}],
			},
			[],
		);

		expect(entries).toHaveLength(1);
		expect(entries[0].feedbackQuestionnaire).toEqual(questionnaire);
	});

	it("uses default editable questionnaire for old feedback-enabled schemas", () => {
		const entries = extractPredictionExplanationEntries(
			predictionValue,
			{
				fields: [{ kind: "number", label: "petal_length" }],
				explanations: [{
					kind: "Crystal Tree",
					id: "crystal-tree",
					feedbackEnabled: true,
				}],
			},
			[],
		);

		expect(entries).toHaveLength(1);
		expect(entries[0].feedbackQuestionnaire?.steps[0].fields.map((field) => field.label)).toEqual([
			"Clarity",
			"Usefulness",
			"Trust",
		]);
	});

	it("builds one review wizard with output then explanation steps", () => {
		const steps = buildReviewFeedbackSteps({
			targets: [{ order: 0, value: "setosa" }],
			outputFeedbackByOrder: new Map(),
			explanationFeedbackByOrder: new Map(),
			reports: [{ kind: "classifier", labels: ["setosa"], label: "species" }],
			signatureSchema: { reports: [{ kind: "classifier", labels: ["setosa"], label: "species" }] },
			predictionValue: { outputs: ["setosa"] },
			explanations: [{
				order: 0,
				key: "crystal-tree",
				label: "Crystal Tree",
				content: ["petal_length > 4.8"],
				feedbackQuestionnaire: questionnaire,
			}],
		});
		const combined = buildCombinedReviewQuestionnaire(steps);

		expect(steps.map((step) => step.kind)).toEqual(["output", "explanation"]);
		expect(combined.schema.steps.map((step) => step.title)).toEqual([
			"Output 1: species",
			"Explanation 1: Crystal Tree",
		]);
		expect(combined.schema.steps[0].description).toContain("setosa");
		expect(combined.schema.steps[1].description).toContain("petal_length > 4.8");
	});

	it("maps combined review wizard values back to each feedback payload", () => {
		const steps = buildReviewFeedbackSteps({
			targets: [{ order: 0, value: "setosa" }],
			outputFeedbackByOrder: new Map(),
			explanationFeedbackByOrder: new Map(),
			reports: [{ questionnaire }],
			signatureSchema: { outputs: [{ name: "species" }] },
			predictionValue: { outputs: ["setosa"] },
			explanations: [{
				order: 1,
				key: "crystal-tree",
				label: "Crystal Tree",
				content: ["petal_length > 4.8"],
				feedbackQuestionnaire: questionnaire,
			}],
		});

		expect(valuesForStep({
			"output-0-output-feedback-assessment": 4,
			"explanation-1-clarity": 5,
		}, steps[0])).toEqual({ "output-feedback-assessment": 4 });
		expect(valuesForStep({
			"output-0-output-feedback-assessment": 4,
			"explanation-1-clarity": 5,
		}, steps[1])).toEqual({ clarity: 5 });
	});
});
