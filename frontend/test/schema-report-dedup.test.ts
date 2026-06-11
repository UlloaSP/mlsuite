/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { buildCombinedFeedbackQuestionnaire } from "../src/models/combined-feedback-questionnaire";
import type { SignatureDto } from "../src/models/api/modelService";
import { prepareSchemaVersionForSave } from "../src/schemas/schema-binding-rebase";
import { composeSchemaVersion } from "../src/schemas/schema-composer";
import { isSchemaFeedbackComplete } from "../src/schemas/schema-feedback-state";
import { buildSchemaFeedbackSteps } from "../src/schemas/schema-feedback-steps";
import { buildPendingSchemaRunFeedback } from "../src/schemas/schema-run-save-feedback";
import type { PredictionResultDto, SchemaVersionDto } from "../src/schemas/types";

const questionnaire = {
  steps: [{ id: "review", fields: [{ id: "assessment", kind: "text", label: "Assessment" }] }],
};

const signature = (id: string, modelId: string, reports: unknown[]): SignatureDto => ({
  id,
  modelId,
  name: id,
  inputSignature: { fields: [], reports },
  major: 1,
  minor: 0,
  patch: 0,
  createdAt: "2026-06-10T00:00:00Z",
});

const result = (
  id: string,
  modelId: string,
  signatureId: string,
  text: string,
): PredictionResultDto => ({
  id,
  runId: "run-1",
  modelId,
  signatureId,
  modelInput: {},
  output: { reports: { assessment: { explanation: text } } },
  status: "SUCCESS",
  createdAt: "2026-06-10T00:00:00Z",
});

const versionFrom = (composed: ReturnType<typeof composeSchemaVersion>): SchemaVersionDto => ({
  id: "version-1",
  schemaId: "schema-1",
  version: 1,
  name: composed.name,
  formSchema: composed.formSchema,
  bindings: composed.bindings.map((binding, index) => ({
    id: `binding-${index + 1}`,
    schemaVersionId: "version-1",
    modelId: binding.modelId,
    signatureId: binding.signatureId,
    inputMapping: binding.inputMapping ?? {},
    outputMapping: binding.outputMapping ?? {},
    pluginPolicy: binding.pluginPolicy,
  })),
  createdAt: "2026-06-10T00:00:00Z",
});

describe("schema report dedup", () => {
  test("deduplicates identical report contracts and keeps per-binding source mappings", () => {
    const report = {
      id: "assessment",
      source: "assessment",
      label: "Assessment",
      kind: "Crystal Tree",
      feedbackQuestionnaire: questionnaire,
    };
    const composed = composeSchemaVersion("v1", [
      { modelId: "model-1", signature: signature("signature-1", "model-1", [report]) },
      { modelId: "model-2", signature: signature("signature-2", "model-2", [report]) },
    ]);

    const reports = composed.formSchema.reports as Array<Record<string, unknown>>;
    const reportId = String(reports[0]?.id);
    expect(reports).toHaveLength(1);
    expect(composed.bindings[0]?.outputMapping).toEqual({ [reportId]: "assessment" });
    expect(composed.bindings[1]?.outputMapping).toEqual({ [reportId]: "assessment" });
  });

  test("keeps reports separate when questionnaire contract differs", () => {
    const first = {
      id: "assessment",
      label: "Assessment",
      kind: "Crystal Tree",
      feedbackQuestionnaire: questionnaire,
    };
    const second = {
      ...first,
      feedbackQuestionnaire: {
        steps: [{ id: "review", fields: [{ id: "note", kind: "text", label: "Note" }] }],
      },
    };

    const composed = composeSchemaVersion("v1", [
      { modelId: "model-1", signature: signature("signature-1", "model-1", [first]) },
      { modelId: "model-2", signature: signature("signature-2", "model-2", [second]) },
    ]);

    expect(composed.formSchema.reports).toHaveLength(2);
  });

  test("groups schema feedback steps by shared report definition", () => {
    const report = {
      id: "assessment",
      label: "Assessment",
      kind: "Crystal Tree",
      feedbackQuestionnaire: questionnaire,
    };
    const composed = composeSchemaVersion("v1", [
      { modelId: "model-1", signature: signature("signature-1", "model-1", [report]) },
      { modelId: "model-2", signature: signature("signature-2", "model-2", [report]) },
    ]);

    const steps = buildSchemaFeedbackSteps(
      versionFrom(composed),
      [
        result("result-1", "model-1", "signature-1", "First opinion"),
        result("result-2", "model-2", "signature-2", "Second opinion"),
      ],
      [],
    );
    const combined = buildCombinedFeedbackQuestionnaire(steps);

    expect(steps).toHaveLength(1);
    expect(steps[0]?.type).toBe("EXPLANATION");
    expect(steps[0]?.usages).toHaveLength(2);
    expect(combined.schema.steps).toHaveLength(1);
  });

  test("fans out one grouped questionnaire value to every pending usage", () => {
    const report = {
      id: "assessment",
      label: "Assessment",
      kind: "Crystal Tree",
      feedbackQuestionnaire: questionnaire,
    };
    const composed = composeSchemaVersion("v1", [
      { modelId: "model-1", signature: signature("signature-1", "model-1", [report]) },
      { modelId: "model-2", signature: signature("signature-2", "model-2", [report]) },
    ]);
    const results = [
      result("result-1", "model-1", "signature-1", "First opinion"),
      result("result-2", "model-2", "signature-2", "Second opinion"),
    ];
    const steps = buildSchemaFeedbackSteps(versionFrom(composed), results, []);

    expect(
      buildPendingSchemaRunFeedback(steps, { [`${steps[0]?.id}-assessment`]: "correct" }, results),
    ).toEqual([
      {
        modelId: "model-1",
        signatureId: "signature-1",
        type: "EXPLANATION",
        order: 0,
        value: { assessment: "correct" },
      },
      {
        modelId: "model-2",
        signatureId: "signature-2",
        type: "EXPLANATION",
        order: 0,
        value: { assessment: "correct" },
      },
    ]);
  });

  test("requires saved feedback for every grouped usage", () => {
    const report = {
      id: "assessment",
      label: "Assessment",
      kind: "Crystal Tree",
      feedbackQuestionnaire: questionnaire,
    };
    const composed = composeSchemaVersion("v1", [
      { modelId: "model-1", signature: signature("signature-1", "model-1", [report]) },
      { modelId: "model-2", signature: signature("signature-2", "model-2", [report]) },
    ]);
    const results = [
      result("result-1", "model-1", "signature-1", "First opinion"),
      result("result-2", "model-2", "signature-2", "Second opinion"),
    ];

    expect(
      isSchemaFeedbackComplete(
        buildSchemaFeedbackSteps(versionFrom(composed), results, [
          {
            id: "fb-1",
            resultId: "result-1",
            type: "EXPLANATION",
            order: 0,
            value: { assessment: "correct" },
            createdAt: "",
          },
        ]),
      ),
    ).toBe(false);
    expect(
      isSchemaFeedbackComplete(
        buildSchemaFeedbackSteps(versionFrom(composed), results, [
          {
            id: "fb-1",
            resultId: "result-1",
            type: "EXPLANATION",
            order: 0,
            value: { assessment: "correct" },
            createdAt: "",
          },
          {
            id: "fb-2",
            resultId: "result-2",
            type: "EXPLANATION",
            order: 0,
            value: { assessment: "correct" },
            createdAt: "",
          },
        ]),
      ),
    ).toBe(true);
  });

  test("preserves shared bound report once during schema save preparation", () => {
    const request = composeSchemaVersion("v1", [
      {
        modelId: "model-1",
        signature: signature("signature-1", "model-1", [
          {
            id: "assessment",
            label: "Assessment",
            kind: "Crystal Tree",
            feedbackQuestionnaire: questionnaire,
          },
        ]),
      },
      {
        modelId: "model-2",
        signature: signature("signature-2", "model-2", [
          {
            id: "assessment",
            label: "Assessment",
            kind: "Crystal Tree",
            feedbackQuestionnaire: questionnaire,
          },
        ]),
      },
    ]);

    const prepared = prepareSchemaVersionForSave(request, request.formSchema);

    expect(prepared.formSchema.reports).toHaveLength(1);
    expect((prepared.formSchema.reports as Array<Record<string, unknown>>)[0]?.label).toBe(
      "Assessment",
    );
  });
});
