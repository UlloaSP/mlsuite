/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { describe, expect, test } from "vite-plus/test";
import {
  applyOneHotMappedCategories,
  countVisibleSchemaFields,
} from "../src/schemas/one-hot-schema";

describe("schema one-hot merge", () => {
  test("groups only feature double-underscore category fields", () => {
    const schema = applyOneHotMappedCategories({
      fields: [
        { id: "a", label: "blood_group__A", kind: "number" },
        { id: "b", label: "blood_group__B", kind: "number" },
      ],
      reports: [],
    });

    expect(schema.fields[0]).toMatchObject({
      kind: "mapped-category",
      label: "Blood Group",
      options: [
        { value: "A", mapping: expect.objectContaining({ "blood-group-a": 1 }) },
        { value: "B", mapping: expect.objectContaining({ "blood-group-b": 1 }) },
      ],
    });
    expect(countVisibleSchemaFields(schema)).toBe(1);
  });

  test("does not group single underscore, hyphen, or empty parts", () => {
    const schema = applyOneHotMappedCategories({
      fields: [
        { id: "single-a", label: "blood_group_A", kind: "number" },
        { id: "single-b", label: "blood_group_B", kind: "number" },
        { id: "hyphen-a", label: "blood-group-A", kind: "number" },
        { id: "hyphen-b", label: "blood-group-B", kind: "number" },
        { id: "empty-right", label: "feature__", kind: "number" },
        { id: "empty-left", label: "__value", kind: "number" },
      ],
      reports: [],
    });

    expect(schema.fields).toHaveLength(6);
    expect(schema.fields.some((field) => field.kind === "mapped-category")).toBe(false);
    expect(countVisibleSchemaFields(schema)).toBe(6);
  });
});
