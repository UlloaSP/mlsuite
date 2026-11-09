/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  toExecutableSchemaVersion,
  toSavedSchemaVersion,
} from "@/capabilities/prediction-runtime/mlform/executable-schema";

const bindings = [
  { modelId: 1, modelName: "Model One", pluginPolicy: { reportKinds: ["classifier"] } },
];

describe("toExecutableSchemaVersion", () => {
  test("rejects editor-added plugin reports without mappedTo", () => {
    const version = {
      name: "v1",
      bindings,
      formSchema: {
        fields: [{ id: "age", label: "age", kind: "number" }],
        reports: [
          { label: "Risk", kind: "classifier", mappedTo: { "Model One:Signature One": "risk" } },
          {
            id: "crystal-tree",
            source: "crystal-tree",
            label: "Crystal Tree",
            kind: "Crystal Tree",
          },
        ],
      },
    };

    expect(() => toExecutableSchemaVersion(version)).toThrow("Schema report 2 has no mappedTo");
  });

  test("saves bound reports and bindings, dropping editor-only report keys", () => {
    const version = {
      id: "version-1",
      name: "v1",
      bindings,
      formSchema: {
        fields: [],
        reports: [
          {
            id: "risk",
            source: "editor",
            label: "Risk",
            kind: "classifier",
            mappedTo: { "Model One:Signature One": "risk" },
          },
        ],
      },
    };

    const saved = toSavedSchemaVersion(version);

    expect(saved.id).toBe("version-1");
    expect(saved.bindings).toEqual(bindings);
    expect(saved.formSchema.reports).toEqual([
      { label: "Risk", kind: "classifier", mappedTo: { "Model One:Signature One": "risk" } },
    ]);
    // A stored version runs as stored: its report ids name the copies its runs keep.
    expect(toExecutableSchemaVersion(version).formSchema.reports).toEqual(
      version.formSchema.reports,
    );
  });

  test("keeps a report mapped to a bare output position, which serves every bound model", () => {
    const version = {
      name: "v1",
      bindings,
      formSchema: { fields: [], reports: [{ label: "Risk", kind: "classifier", mappedTo: 0 }] },
    };

    expect(toExecutableSchemaVersion(version).formSchema.reports).toEqual([
      { label: "Risk", kind: "classifier", mappedTo: 0 },
    ]);
  });
});
