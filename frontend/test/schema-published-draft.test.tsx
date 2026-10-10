// @vitest-environment jsdom

import { expect, test, vi } from "vite-plus/test";
import { useAtomValue } from "jotai";
import { Route, Routes } from "react-router";
import { schemaTextAtom } from "@/features/schemas/lib/editor-atoms";
import { click, mount } from "./support/dom";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  draft: {
    id: "12",
    schemaId: "7",
    name: "QA change",
    status: "PUBLISHED",
    formSchema: { fields: [] as unknown[] },
    bindings: [],
    revision: 1,
    baseVersion: 1,
  },
}));
vi.mock("@/features/schemas/api/schema-queries", () => ({
  useSchema: () => ({ data: { name: "QA schema" } }),
  useSchemaDraft: () => ({
    data: mocks.draft,
  }),
  useSchemaDraftDiff: () => ({ data: { changes: [] } }),
}));
vi.mock("@/features/schemas/api/schema-draft-mutations", () => ({
  useUpdateSchemaDraftMutation: () => ({ mutateAsync: mocks.update, isPending: false }),
}));
vi.mock("@/features/schemas/components/SchemaCodeViewer", () => ({
  SchemaCodeViewer: ({ value }: { value: string }) => <pre data-testid="readonly">{value}</pre>,
}));
vi.mock("@/features/schemas/components/EditorWrapper", () => ({
  EditorWrapper: () => (
    <textarea aria-label="Editable schema" value={useAtomValue(schemaTextAtom)} readOnly />
  ),
}));
vi.mock("@/features/schemas/components/SchemaFormPreview", () => ({
  SchemaFormPreview: () => null,
}));
vi.mock("@/features/schemas/components/SchemaChangeNameDialog", () => ({
  SchemaChangeNameDialog: () => null,
}));

import { SchemaDraftEditorPage } from "@/features/schemas/pages/schema-draft-editor-page";

test.each(["DRAFT", "CONFLICT", "PUBLISHED"])(
  "%s change exposes only supported editing actions",
  async (status) => {
    mocks.draft = { ...mocks.draft, status };
    const { host: container } = await mount(<SchemaDraftEditorPage />, { route: "/" });
    const published = status === "PUBLISHED";
    expect(Boolean(container.querySelector('[aria-label="Editable schema"]'))).toBe(!published);
    expect(Boolean(container.querySelector('[data-testid="readonly"]'))).toBe(published);
    expect(
      [...container.querySelectorAll("button")].some((button) => button.textContent === "Save"),
    ).toBe(!published);
    expect(
      [...container.querySelectorAll("button")].some(
        (button) => button.textContent === "Review changes",
      ),
    ).toBe(!published);
    if (published) {
      expect(container.textContent).toContain("published and is read-only");
      expect(container.querySelector("a")?.getAttribute("href")).toBe("/schemas/7/snapshots");
    }
  },
);

test.each(["DRAFT", "CONFLICT", "PUBLISHED"])(
  "%s series change preserves stored data and uses the supported editor format",
  async (status) => {
    const formSchema = {
      fields: [
        {
          kind: "series",
          label: "History",
          mappedTo: "history",
          field1: { kind: "number", label: "Time" },
          field2: { kind: "number", label: "Value" },
          defaultValue: [[1, 2]],
        },
      ],
    };
    const original = structuredClone(formSchema);
    mocks.draft = { ...mocks.draft, status, formSchema };
    mocks.update.mockClear();
    const { host } = await mount(
      <Routes>
        <Route path="/schemas/:schemaId/drafts/:draftId" element={<SchemaDraftEditorPage />} />
      </Routes>,
      { route: "/schemas/7/drafts/12" },
    );
    if (status === "PUBLISHED") {
      expect(JSON.parse(host.querySelector('[data-testid="readonly"]')!.textContent!)).toEqual(
        original,
      );
      expect(mocks.update).not.toHaveBeenCalled();
    } else {
      const edited = JSON.parse(host.querySelector<HTMLTextAreaElement>("textarea")!.value);
      expect(edited.fields[0]).toMatchObject({
        columns: [{ id: "field1" }, { id: "field2" }],
        defaultValue: [{ field1: 1, field2: 2 }],
      });
      expect(edited.fields[0]).not.toHaveProperty("field1");
      expect(edited.fields[0]).not.toHaveProperty("field2");
      await click("Save", host);
      expect(mocks.update).toHaveBeenCalledWith(
        expect.objectContaining({ expectedDraftRevision: 1, formSchema: edited }),
      );
    }
    expect(formSchema).toEqual(original);
  },
);
