/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, it } from "vite-plus/test";
import { buildPredictionExportData } from "../src/models/buildPredictionExport";
import type { OutputFeedbackDto, PredictionDto, TargetDto } from "../src/models/api/modelService";

const prediction = (overrides: Partial<PredictionDto> = {}): PredictionDto => ({
	id: "99",
	signatureId: "11",
	modelId: "7",
	name: "customer-row-1",
	inputs: { age: 42 },
	prediction: { outputs: [{ type: "regressor", values: [2.5] }] },
	status: "COMPLETED",
	createdAt: "2026-01-01T00:00:00Z",
	...overrides,
});

const target = (overrides: Partial<TargetDto> = {}): TargetDto => ({
	id: "12",
	predictionId: "99",
	order: 0,
	value: 2.5,
	createdAt: "2026-01-01T00:00:00Z",
	...overrides,
});

const outputFeedback = (userEmail: string, assessment: unknown): OutputFeedbackDto => ({
	id: "31",
	predictionId: "99",
	userId: userEmail === "ana@example.com" ? 1 : 2,
	userName: userEmail,
	userEmail,
	order: 0,
	value: { "output-feedback-assessment": assessment },
	createdAt: "2026-01-01T00:00:00Z",
});

describe("prediction CSV export", () => {
	it("uses prediction name instead of id and embeds reviewer emails in feedback headers", () => {
		const result = buildPredictionExportData({
			predictions: [prediction()],
			targetsByPrediction: [[target()]],
			outputFeedbackByPrediction: [[
				outputFeedback("zoe@example.com", "3.5"),
				outputFeedback("ana@example.com", "4.5"),
			]],
			explanationFeedbackByPrediction: [[]],
			signatureSchema: {
				fields: [{ kind: "number", label: "age" }],
				reports: [{ kind: "regressor", id: "score" }],
			},
			customExplanationDefinitions: [],
		});

		expect(result.headers).toEqual([
			"prediction_name",
			"age",
			"output.score.predicted",
			"output.score.feedback.ana@example.com",
			"output.score.feedback.zoe@example.com",
		]);
		expect(result.headers).not.toContain("prediction_id");
		expect(result.headers).not.toContain("reviewer");
		expect(result.rows).toEqual([["customer-row-1", "42", "2.5", "4.5", "3.5"]]);
	});
});
