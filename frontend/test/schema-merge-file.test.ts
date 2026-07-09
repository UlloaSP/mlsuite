import { describe, expect, test } from "vite-plus/test";
import { buildSchemaMergeFile } from "../src/schemas/utils/schema-merge-file";

type Change = Parameters<typeof buildSchemaMergeFile>[0]["changes"][number];

const change = (path: string): Change => ({
  path,
  baseValue: undefined,
  basePresent: false,
  currentValue: undefined,
  currentPresent: false,
  draftValue: undefined,
  draftPresent: false,
  draftChanged: true,
  conflict: true,
});

const build = (current: unknown, incoming: unknown, paths: string[]) =>
  buildSchemaMergeFile({
    currentLabel: "snapshot/latest",
    incomingLabel: "change/incoming",
    currentSchema: current,
    incomingSchema: incoming,
    changes: paths.map(change),
  });

const resolvedSides = (contents: string) => {
  const match = contents.match(/<<<<<<<[^\n]*\n([\s\S]*?)\n=======\n([\s\S]*?)\n>>>>>>>[^\n]*/);
  if (!match) throw new Error("missing conflict");
  return [match[1], match[2]].map((side) => JSON.parse(contents.replace(match[0], side)));
};

describe("buildSchemaMergeFile", () => {
  test("renders independent RFC 6901 paths in visual order", () => {
    const result = build(
      { formSchema: { fields: [{ label: "Age" }, { label: "GPT score" }] }, bindings: [] },
      {
        formSchema: { fields: [{ label: "Patient age" }, { label: "Clinical GPT score" }] },
        bindings: [],
      },
      ["/formSchema/fields/1/label", "/formSchema/fields/0/label"],
    );

    expect(result.conflictGroups).toEqual([
      { paths: ["/formSchema/fields/0/label"] },
      { paths: ["/formSchema/fields/1/label"] },
    ]);
    expect(result.contents.match(/<<<<<<</g)).toHaveLength(2);
    expect(result.contents).toContain('"label": "Clinical GPT score"');
  });

  test("escapes slash and tilde while dots remain literal keys", () => {
    const result = build(
      { formSchema: { "a.b": { "a/b~c": "old" } }, bindings: [] },
      { formSchema: { "a.b": { "a/b~c": "new" } }, bindings: [] },
      ["/formSchema/a.b/a~1b~0c"],
    );

    expect(result.conflictGroups).toEqual([{ paths: ["/formSchema/a.b/a~1b~0c"] }]);
    expect(result.contents).toContain('"a/b~c": "new"');
  });

  test("groups parent and child paths into one conflict action", () => {
    const result = build(
      { formSchema: { field: { label: "old", help: "old" } }, bindings: [] },
      { formSchema: { field: { label: "new", help: "new" } }, bindings: [] },
      ["/formSchema/field", "/formSchema/field/label"],
    );

    expect(result.conflictGroups).toEqual([
      { paths: ["/formSchema/field", "/formSchema/field/label"] },
    ]);
    expect(result.contents.match(/<<<<<<</g)).toHaveLength(1);
    expect(resolvedSides(result.contents)).toEqual([
      { formSchema: { field: { label: "old", help: "old" } }, bindings: [] },
      { formSchema: { field: { label: "new", help: "new" } }, bindings: [] },
    ]);
  });

  test.each([
    {
      name: "deleted property",
      current: { formSchema: { keep: true, removed: "old" }, bindings: [] },
      incoming: { formSchema: { keep: true }, bindings: [] },
      path: "/formSchema/removed",
    },
    {
      name: "shortened array",
      current: { formSchema: { items: ["a", "b"] }, bindings: [] },
      incoming: { formSchema: { items: ["a"] }, bindings: [] },
      path: "/formSchema/items/1",
    },
    {
      name: "object changed to scalar",
      current: { formSchema: { field: "now scalar" }, bindings: [] },
      incoming: { formSchema: { field: { label: "draft" } }, bindings: [] },
      path: "/formSchema/field/label",
    },
    {
      name: "null changed to a value",
      current: { formSchema: { field: null }, bindings: [] },
      incoming: { formSchema: { field: "draft" }, bindings: [] },
      path: "/formSchema/field",
    },
  ])(
    "ascends $name to a shared ancestor and both choices stay valid JSON",
    ({ current, incoming, path }) => {
      const result = build(current, incoming, [path]);

      expect(result.conflictGroups).toEqual([{ paths: [path] }]);
      expect(resolvedSides(result.contents)).toEqual([current, incoming]);
      expect(result.contents.lastIndexOf(">>>>>>>")).toBeLessThan(result.contents.lastIndexOf("}"));
    },
  );

  test("renders bindings in the same merge document", () => {
    const current = { formSchema: { title: "same" }, bindings: [{ modelId: "model-a" }] };
    const incoming = { formSchema: { title: "same" }, bindings: [{ modelId: "model-b" }] };
    const result = build(current, incoming, ["/bindings/0/modelId"]);

    expect(result.conflictGroups).toEqual([{ paths: ["/bindings/0/modelId"] }]);
    expect(resolvedSides(result.contents)).toEqual([current, incoming]);
  });

  test("deduplicates unknown paths and safely groups them at the document root", () => {
    const current = { formSchema: {}, bindings: [] };
    const incoming = { formSchema: { added: true }, bindings: [] };
    const result = build(current, incoming, ["/unknown/leaf", "/unknown/leaf"]);

    expect(result.conflictGroups).toEqual([{ paths: ["/unknown/leaf"] }]);
    expect(result.contents.match(/<<<<<<</g)).toHaveLength(1);
    expect(resolvedSides(result.contents)).toEqual([current, incoming]);
  });
});
