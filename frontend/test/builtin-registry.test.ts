/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, it } from "vite-plus/test";
import { createMlRegistryPack } from "mlform/builtins";
import { schemaNeedsPluginCatalog } from "../src/algorithms/plugin/schema-needs-plugin-catalog";
import { validateMlformSchema } from "../src/algorithms/mlform/schema-validation";

const builtinSchema = {
  fields: [
    { kind: "text", label: "Name", displayKey: "name", mappedTo: "name" },
    { kind: "number", label: "Age", displayKey: "age", mappedTo: "age" },
  ],
  reports: [{ kind: "classifier", labels: ["yes", "no"], mappedTo: "classifier" }],
};

describe("MLForm builtin registry", () => {
  it("registers MLForm field and report builtins by default", () => {
    const registry = createMlRegistryPack().registry;

    expect(registry.getField("text")).toBeDefined();
    expect(registry.getField("number")).toBeDefined();
    expect(registry.getReport("classifier")).toBeDefined();
    expect(registry.getReport("regressor")).toBeDefined();
  });

  it("validates builtin schema without plugin catalog", () => {
    const result = validateMlformSchema(builtinSchema);

    expect(result.success).toBe(true);
    expect(schemaNeedsPluginCatalog(builtinSchema)).toBe(false);
  });

  it("validates persisted onehot mapped records through runtime adapter", () => {
    const result = validateMlformSchema({
      fields: [
        {
          kind: "onehot-category",
          label: "Blood",
          displayKey: "blood",
          options: [
            { label: "A", value: "A", mappedTo: { "Model:Signature": "blood__A" } },
            { label: "B", value: "B", mappedTo: { "Model:Signature": "blood__B" } },
          ],
        },
      ],
      reports: [{ kind: "classifier", label: "Risk", mappedTo: { "Model:Signature": "risk" } }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown field kinds without treating them as builtins", () => {
    const result = validateMlformSchema({
      fields: [{ kind: "missing-custom-field", label: "Broken" }],
    });

    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("plugin catalog"))).toBe(true);
    expect(schemaNeedsPluginCatalog({ fields: [{ kind: "missing-custom-field" }] })).toBe(true);
  });

  it("returns editor issues when mappedTo is missing", () => {
    const result = validateMlformSchema({
      fields: [
        { kind: "number", label: "Age" },
        {
          kind: "onehot-category",
          label: "Blood",
          options: [{ label: "A", value: "A" }],
        },
      ],
      reports: [{ kind: "classifier" }],
    });

    expect(result.success).toBe(false);
    expect(result.issues.map((issue) => issue.message)).toEqual(
      expect.arrayContaining([
        "Schema field 1 falta mappedTo",
        "Schema field 2 option 1 falta mappedTo",
        "Schema report 1 falta mappedTo",
      ]),
    );
  });
});
