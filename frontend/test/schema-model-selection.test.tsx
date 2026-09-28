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

const manyModels = Array.from({ length: 15 }, (_, index) => ({
  ...model,
  id: String(index + 1),
  name: `Model ${String(index + 1).padStart(2, "0")}`,
}));

async function mountPicker(models: SchemaSourceModel[]) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <MemoryRouter initialEntries={["/schemas/create"]}>
        <CreateSchemaPage models={models} isLoading={false} />
      </MemoryRouter>,
    ),
  );
  const options = () =>
    [...container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")].map(
      (button) => button.textContent,
    );
  const click = async (label: string) => {
    const button = [...container.querySelectorAll("button")].find(
      (item) => item.textContent?.trim() === label || item.getAttribute("aria-label") === label,
    )!;
    await act(async () => button.click());
  };
  return { container, options, click };
}

test("pages the model list and keeps the selection across pages", async () => {
  const { container, options, click } = await mountPicker(manyModels);
  expect(options()).toHaveLength(10);
  const first = [...container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")][0];
  await act(async () => first.click());
  expect(first.getAttribute("aria-pressed")).toBe("true");

  await click("Next");
  expect(options()).toHaveLength(5);
  expect(options()[0]).toContain("Model 11");
  expect(container.textContent).toContain("1 selected");

  await click("Remove Model 01");
  expect(container.textContent).toContain("0 selected");
});

test("search narrows the model list and says when nothing matches", async () => {
  const { container, options } = await mountPicker(manyModels);
  const search = container.querySelector<HTMLInputElement>('input[aria-label="Search models"]')!;
  const type = async (value: string) =>
    act(async () => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(search, value);
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });

  await type("model 12");
  expect(options()).toEqual([expect.stringContaining("Model 12")]);
  await type("nothing like this");
  expect(container.textContent).toContain("No matching models");
});
