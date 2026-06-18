/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  prepareSchemaVersionDtoForUse,
  prepareSchemaVersionForSave,
} from "../src/algorithms/schema/binding-rebase";
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
      modelName: "Model One",
      pluginPolicy: { reportKinds: ["classifier"] },
    },
    {
      modelId: "model-2",
      modelName: "Model Two",
      pluginPolicy: { reportKinds: ["classifier"] },
    },
  ],
});

describe("prepareSchemaVersionForSave", () => {
  test("rejects editor-added plugin reports without mappedTo", () => {
    const edited = {
      fields: [{ id: "age", label: "age", kind: "number" }],
      reports: [
        {
          id: "model-1-signature-1-risk",
          label: "Risk · model-1",
          kind: "classifier",
          mappedTo: { "Model One:Signature One": "risk" },
        },
        {
          id: "crystal-tree",
          source: "crystal-tree",
          label: "Crystal Tree",
          kind: "Crystal Tree",
          feedbackQuestionnaire: { steps: [] },
        },
      ],
    };

    expect(() => prepareSchemaVersionForSave(baseRequest(), edited)).toThrow(
      "Schema report 2 falta mappedTo",
    );
  });

  test("keeps existing bound reports stable", () => {
    const request = {
      ...baseRequest(),
      formSchema: {
        ...baseRequest().formSchema,
        reports: [
          {
            label: "Risk · model-1",
            kind: "classifier",
            mappedTo: { "Model One:Signature One": "risk" },
          },
        ],
      },
    };
    const prepared = prepareSchemaVersionForSave(request, request.formSchema);

    expect(prepared.formSchema.reports).toEqual(request.formSchema.reports);
  });

  test("rejects saved unbound plugin reports at runtime", () => {
    expect(() =>
      prepareSchemaVersionDtoForUse({
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
          modelName: binding.modelName,
          pluginPolicy: binding.pluginPolicy,
        })),
      }),
    ).toThrow("Schema report 1 falta mappedTo");
  });
});
