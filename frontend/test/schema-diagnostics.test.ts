import { describe, expect, test } from "vite-plus/test";
import { pathToPos, pointerToPos } from "@/features/schemas/lib/schema-diagnostics";

const schema = `{
  "fields": [
    { "kind": "text", "id": "age" },
    42
  ],
  "a/b": { "c~d": true, "7": "a key, not an index" }
}`;

describe("schema diagnostics", () => {
  test("positions an issue at its value", () => {
    expect(pathToPos(schema, ["fields", 0, "kind"])).toEqual({ line: 3, column: 15 });
    expect(pathToPos(schema, ["fields", 1])).toEqual({ line: 4, column: 5 });
  });

  test("decodes a JSON pointer's escapes and array indexes", () => {
    expect(pointerToPos(schema, "/fields/0/id")).toEqual({ line: 3, column: 29 });
    expect(pointerToPos(schema, "/a~1b/c~0d")).toEqual({ line: 6, column: 19 });
    expect(pointerToPos(schema, "/a~1b/7")).toEqual({ line: 6, column: 30 });
    expect(pointerToPos(schema, "")).toEqual({ line: 1, column: 1 });
  });

  test("falls back to the document start for unknown paths and text that does not parse", () => {
    expect(pathToPos(schema, ["missing"])).toEqual({ line: 1, column: 1 });
    expect(pointerToPos(schema, "/fields/9")).toEqual({ line: 1, column: 1 });
    expect(pointerToPos('{ "fields": [', "/fields")).toEqual({ line: 1, column: 1 });
  });
});
