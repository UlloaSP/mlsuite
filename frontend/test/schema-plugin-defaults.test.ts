/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { defineReportKind } from "mlform/kit";
import { z } from "zod";
import { describe, expect, test } from "vite-plus/test";
import type { CatalogReportDefinition } from "../src/app/utils/mlform/custom-report";
import { createSchemaRunRuntime } from "../src/app/utils/mlform/schema-run-runtime";

const definition = (): CatalogReportDefinition => ({
  id: "crystal",
  fileName: "crystal.ts",
  source: "",
  updatedAt: "",
  createdAt: "",
  contentType: "text/typescript",
  sizeBytes: 1,
  active: true,
  kind: "Crystal Tree",
  definition: defineReportKind({
    kind: "Crystal Tree",
    schema: z.object({
      kind: z.literal("Crystal Tree"),
      id: z.string().optional(),
      source: z.string().optional(),
      endpoint: z.string().min(1).default("/api/analyzer/explanations"),
    }),
    resolve: ({ report, result }) => result.reports[report.id],
    fetch: ({ config }) => ({ submit: async () => ({ endpoint: config.endpoint }) }),
    render: { content: ({ payload }) => ({ type: "text", value: JSON.stringify(payload) }) },
  }),
});

describe("schema plugin defaults", () => {
  test("custom report schema default endpoint is present after runtime normalization", () => {
    const runtime = createSchemaRunRuntime({
      schema: { fields: [], reports: [{ id: "crystal", kind: "Crystal Tree" }] },
      bindings: [],
      customReportDefinitions: [definition()],
    });
    expect(runtime.formSchema.reports[0]).toEqual(
      expect.objectContaining({ endpoint: "/api/analyzer/explanations" }),
    );
  });
});
