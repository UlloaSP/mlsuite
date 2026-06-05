/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import type { SignatureDto } from "../src/models/api/modelService";
import { chooseSchemaSignature } from "../src/schemas/schema-signature-selection";

const signature = (
  id: string,
  version: [number, number, number],
  reports: unknown[] = [],
): SignatureDto => ({
  id,
  modelId: "model-1",
  name: id,
  inputSignature: { fields: [], reports },
  major: version[0],
  minor: version[1],
  patch: version[2],
  createdAt: "2026-06-04T00:00:00Z",
});

describe("schema signature selection", () => {
  test("defaults to highest semantic version", () => {
    const selected = chooseSchemaSignature([
      signature("v0.0.1", [0, 0, 1]),
      signature("v0.1.0", [0, 1, 0], [{ kind: "Crystal Tree" }]),
      signature("v0.0.0", [0, 0, 0]),
    ]);

    expect(selected?.id).toBe("v0.1.0");
    expect(selected?.inputSignature.reports).toEqual([{ kind: "Crystal Tree" }]);
  });

  test("keeps explicit signature override", () => {
    const selected = chooseSchemaSignature(
      [signature("v0.0.1", [0, 0, 1]), signature("v0.1.0", [0, 1, 0], [{ kind: "Crystal Tree" }])],
      "v0.0.1",
    );

    expect(selected?.id).toBe("v0.0.1");
    expect(selected?.inputSignature.reports).toEqual([]);
  });
});
