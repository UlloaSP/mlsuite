// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { CreateSchemaPage } from "@/features/schemas/pages/create-schema-page";
import { initialSchemaModels } from "@/features/schemas/lib/schema-model-selection";
import type { SchemaSourceModel } from "@/features/schemas/lib/merge";

vi.mock("@/features/schemas/api/schema-mutations", () => ({
  useCreateSchemaWithInitialVersionMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
const model: SchemaSourceModel = {
  id: "42",
  name: "Risk model",
  type: "CLASSIFIER",
  specificType: "tree",
  inputSchema: { fields: [], reports: [] },
};
let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

test("selects requested available model only", () => {
  expect(initialSchemaModels([model], "42").map((item) => item.modelId)).toEqual(["42"]);
  expect(initialSchemaModels([model], null)).toEqual([]);
  expect(initialSchemaModels([model], "invalid")).toEqual([]);
  expect(initialSchemaModels([{ ...model, inputSchema: {} }], "42")).toEqual([]);
});

test("preselects after models load, then preserves an explicit deselection", async () => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const render = (models: SchemaSourceModel[]) =>
    root?.render(
      <MemoryRouter initialEntries={["/schemas/create?modelId=42"]}>
        <CreateSchemaPage models={models} isLoading={!models.length} />
      </MemoryRouter>,
    );
  await act(async () => render([]));
  expect(container.textContent).toContain("0 selected");
  const numericModel = JSON.parse(JSON.stringify({ ...model, id: 42 }));
  await act(async () => render([numericModel]));
  expect(container.textContent).toContain("1 selected");
  const button = [...container.querySelectorAll("button")].find((item) =>
    item.textContent?.includes("Risk model"),
  )!;
  await act(async () => button.click());
  expect(container.textContent).toContain("0 selected");
  await act(async () => render([{ ...numericModel }]));
  expect(container.textContent).toContain("0 selected");
});
