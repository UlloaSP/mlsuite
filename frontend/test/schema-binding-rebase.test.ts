/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  prepareSchemaVersionDtoForUse,
  prepareSchemaVersionForSave,
} from "../src/schemas/schema-binding-rebase";
import type { CreateSchemaVersionRequest } from "../src/schemas/types";

const baseRequest = (): CreateSchemaVersionRequest => ({
  name: "v1",
  formSchema: {
    fields: [{ id: "age", label: "age", kind: "number" }],
    reports: [{ id: "model-1-signature-1-risk", label: "Risk · model-1", kind: "classifier" }],
  },
  bindings: [
    {
      modelId: "model-1",
      signatureId: "signature-1",
      inputMapping: { age: "age" },
      outputMapping: { "model-1-signature-1-risk": "risk" },
      pluginPolicy: { reportKinds: ["classifier"] },
    },
    {
      modelId: "model-2",
      signatureId: "signature-2",
      inputMapping: { age: "age" },
      outputMapping: {},
      pluginPolicy: { reportKinds: ["classifier"] },
    },
  ],
});

describe("prepareSchemaVersionForSave", () => {
  test("expands editor-added plugin reports into one bound report per model", () => {
    const edited = {
      fields: [{ id: "age", label: "age", kind: "number" }],
      reports: [
        { id: "model-1-signature-1-risk", label: "Risk · model-1", kind: "classifier" },
        {
          id: "crystal-tree",
          source: "crystal-tree",
          label: "Crystal Tree",
          kind: "Crystal Tree",
          feedbackQuestionnaire: { steps: [] },
        },
      ],
    };

    const prepared = prepareSchemaVersionForSave(baseRequest(), edited);
    const reports = prepared.formSchema.reports as Array<Record<string, unknown>>;

    expect(reports).toHaveLength(3);
    expect(reports.filter((report) => report.kind === "Crystal Tree")).toEqual([
      expect.objectContaining({ label: "Crystal Tree · model-1", source: expect.any(String) }),
      expect.objectContaining({ label: "Crystal Tree · model-2", source: expect.any(String) }),
    ]);
    expect(prepared.bindings[0]?.outputMapping).toEqual({
      "model-1-signature-1-risk": "risk",
      [String(reports[1]?.id)]: "crystal-tree",
    });
    expect(prepared.bindings[1]?.outputMapping).toEqual({
      [String(reports[2]?.id)]: "crystal-tree",
    });
    expect(prepared.bindings[0]?.pluginPolicy?.reportKinds).toContain("Crystal Tree");
    expect(prepared.bindings[1]?.pluginPolicy?.reportKinds).toContain("Crystal Tree");
  });

  test("keeps existing bound reports stable", () => {
    const request = baseRequest();
    const prepared = prepareSchemaVersionForSave(request, request.formSchema);

    expect(prepared.formSchema.reports).toEqual(request.formSchema.reports);
    expect(prepared.bindings[0]?.outputMapping).toEqual(request.bindings[0]?.outputMapping);
  });

  test("expands already-saved versions at runtime for legacy unbound plugin reports", () => {
    const version = prepareSchemaVersionDtoForUse({
      id: "version-1",
      schemaId: "schema-1",
      version: 1,
      name: "v1",
      createdAt: "2026-06-03T00:00:00Z",
      formSchema: {
        fields: [],
        reports: [{ id: "crystal-tree", label: "Crystal Tree", kind: "Crystal Tree" }],
      },
      bindings: baseRequest().bindings.map((binding, index) => ({
        id: `binding-${index + 1}`,
        schemaVersionId: "version-1",
        modelId: binding.modelId,
        signatureId: binding.signatureId,
        inputMapping: binding.inputMapping ?? {},
        outputMapping: binding.outputMapping ?? {},
        pluginPolicy: binding.pluginPolicy,
      })),
    });

    const reports = version.formSchema.reports as Array<Record<string, unknown>>;
    expect(reports.filter((report) => report.kind === "Crystal Tree")).toHaveLength(2);
    expect(version.bindings[0]?.outputMapping).toHaveProperty(
      String(reports[0]?.id),
      "crystal-tree",
    );
    expect(version.bindings[1]?.outputMapping).toHaveProperty(
      String(reports[1]?.id),
      "crystal-tree",
    );
  });
});
