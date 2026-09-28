import { describe, expect, test } from "vite-plus/test";
import { pathToPos } from "@/features/schemas/lib/schema-diagnostics";

const schema = `{
  "fields": [
    { "kind": "text", "id": "age" },
    42
  ]
}`;

describe("schema diagnostics", () => {
  test("positions an issue at its value", () => {
    expect(pathToPos(schema, ["fields", 0, "kind"])).toEqual({ line: 3, column: 15 });
    expect(pathToPos(schema, ["fields", 1])).toEqual({ line: 4, column: 5 });
  });

  test("falls back to the document start for unknown paths", () => {
    expect(pathToPos(schema, ["missing"])).toEqual({ line: 1, column: 1 });
  });
});
