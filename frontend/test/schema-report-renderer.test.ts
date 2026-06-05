/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import { describeSchemaCustomReport } from "../src/schemas/schema-report-descriptor";
import type { CatalogReportDefinition } from "../src/app/utils/mlform/custom-report";

const catalogReport = (): CatalogReportDefinition =>
  ({
    id: "plugin-1",
    fileName: "crystal-tree.ts",
    source: "",
    updatedAt: "",
    createdAt: "",
    contentType: "text/typescript",
    sizeBytes: 1,
    active: true,
    kind: "Crystal Tree",
    definition: {
      describe: () => ({ type: "text", value: "generic describe" }),
      presenter: {
        describe: (_config: unknown, context: { payload?: unknown }) => ({
          type: "text",
          value: String((context.payload as { explanation?: string }).explanation ?? "missing"),
        }),
      },
    },
  }) as unknown as CatalogReportDefinition;

describe("schema report renderer", () => {
  test("uses plugin presenter before generic describe", () => {
    const descriptor = describeSchemaCustomReport(
      catalogReport(),
      { id: "crystal-tree", kind: "Crystal Tree", label: "Crystal Tree" },
      {
        reportId: "crystal-tree",
        payload: { explanation: "Tree explanation" },
        state: { status: "ready", error: null, payload: { explanation: "Tree explanation" } },
        result: {
          reports: { "crystal-tree": { explanation: "Tree explanation" } },
          reportStates: {},
          meta: {},
          raw: {},
          values: {},
          fieldValues: {},
          serializedValues: {},
          serializedFieldValues: {},
        },
      },
    );

    expect(descriptor).toEqual({ type: "text", value: "Tree explanation" });
  });
});
