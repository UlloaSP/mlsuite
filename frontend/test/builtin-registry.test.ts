/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, it } from "vite-plus/test";
import { createMlRegistryPack } from "mlform/builtins";
import { schemaNeedsActivePluginCatalog } from "../src/app/utils/mlform/schema-needs-plugin-catalog";
import { validateMlformSchema } from "../src/app/utils/mlform/schema-validation";

const builtinSchema = {
  fields: [
    { kind: "text", label: "Name" },
    { kind: "number", label: "Age" },
  ],
  reports: [{ kind: "classifier", labels: ["yes", "no"] }],
};

describe("MLForm builtin registry", () => {
  it("registers MLForm field and report builtins by default", () => {
    const registry = createMlRegistryPack().registry;

    expect(registry.getField("text")).toBeDefined();
    expect(registry.getField("number")).toBeDefined();
    expect(registry.getReport("classifier")).toBeDefined();
    expect(registry.getReport("regressor")).toBeDefined();
  });

  it("validates builtin schema without active plugin catalog", () => {
    const result = validateMlformSchema(builtinSchema);

    expect(result.success).toBe(true);
    expect(schemaNeedsActivePluginCatalog(builtinSchema)).toBe(false);
  });

  it("rejects unknown field kinds without treating them as builtins", () => {
    const result = validateMlformSchema({
      fields: [{ kind: "missing-custom-field", label: "Broken" }],
    });

    expect(result.success).toBe(false);
    expect(result.issues.some((issue) => issue.message.includes("active plugin catalog"))).toBe(
      true,
    );
    expect(schemaNeedsActivePluginCatalog({ fields: [{ kind: "missing-custom-field" }] })).toBe(
      true,
    );
  });
});
