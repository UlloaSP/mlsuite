// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  draft: {
    id: "12",
    schemaId: "7",
    name: "QA change",
    status: "PUBLISHED",
    formSchema: { fields: [] },
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
  EditorWrapper: () => <textarea aria-label="Editable schema" />,
}));
vi.mock("@/features/schemas/components/SchemaFormPreview", () => ({
  SchemaFormPreview: () => null,
}));
vi.mock("@/features/schemas/components/SchemaChangeNameDialog", () => ({
  SchemaChangeNameDialog: () => null,
}));

import { SchemaDraftEditorPage } from "@/features/schemas/pages/schema-draft-editor-page";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

test.each(["DRAFT", "CONFLICT", "PUBLISHED"])(
  "%s change exposes only supported editing actions",
  async (status) => {
    mocks.draft = { ...mocks.draft, status };
    await act(async () =>
      root.render(
        <MemoryRouter>
          <SchemaDraftEditorPage />
        </MemoryRouter>,
      ),
    );
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
