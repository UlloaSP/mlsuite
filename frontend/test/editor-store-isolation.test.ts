import { expect, test } from "vite-plus/test";
import { createEditorAtoms } from "@/features/schemas/lib/editor-atoms";

test("keeps schema editor state isolated per draft store", () => {
  const firstDraft = createEditorAtoms();
  const secondDraft = createEditorAtoms();
  firstDraft.schemaText.set("draft one");
  firstDraft.schema.set({ fields: [] });
  firstDraft.editorCheckErrors.set([
    { line: 1, column: 1, path: "fields", message: "invalid", severity: "error" },
  ]);

  expect(secondDraft.schemaText.get()).toBe("");
  expect(secondDraft.schema.get()).toBeNull();
  expect(secondDraft.editorCheckErrors.get()).toEqual([]);
});
