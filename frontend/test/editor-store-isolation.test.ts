import { createStore } from "jotai";
import { expect, test } from "vite-plus/test";
import { schemaAtom, schemaErrorsAtom, schemaTextAtom } from "@/features/schemas/lib/editor-atoms";

test("keeps schema editor state isolated per draft store", () => {
  const firstDraft = createStore();
  const secondDraft = createStore();
  firstDraft.set(schemaTextAtom, "draft one");
  firstDraft.set(schemaAtom, { fields: [] });
  firstDraft.set(schemaErrorsAtom, [
    { line: 1, column: 1, path: "fields", message: "invalid", severity: "error" },
  ]);

  expect(secondDraft.get(schemaTextAtom)).toBe("");
  expect(secondDraft.get(schemaAtom)).toBeNull();
  expect(secondDraft.get(schemaErrorsAtom)).toEqual([]);
});
