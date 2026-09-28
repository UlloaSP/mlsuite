// @vitest-environment jsdom
import { expect, test, vi } from "vite-plus/test";
import { CreateSchemaPage } from "@/features/schemas/pages/create-schema-page";
import { initialSchemaModels } from "@/features/schemas/lib/schema-model-selection";
import type { SchemaSourceModel } from "@/features/schemas/lib/merge";
import { changeValue, click, mount } from "./support/dom";

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

test("selects requested available model only", () => {
  expect(initialSchemaModels([model], "42").map((item) => item.id)).toEqual(["42"]);
  expect(initialSchemaModels([model], null)).toEqual([]);
  expect(initialSchemaModels([model], "invalid")).toEqual([]);
  expect(initialSchemaModels([{ ...model, inputSchema: {} }], "42")).toEqual([]);
});

test("preselects after models load, then preserves an explicit deselection", async () => {
  const page = (models: SchemaSourceModel[]) => (
    <CreateSchemaPage models={models} isLoading={!models.length} />
  );
  const { host: container, rerender } = await mount(page([]), {
    route: "/schemas/create?modelId=42",
  });
  expect(container.textContent).toContain("0 selected");
  const numericModel = JSON.parse(JSON.stringify({ ...model, id: 42 }));
  await rerender(page([numericModel]));
  expect(container.textContent).toContain("1 selected");
  const button = [...container.querySelectorAll("button")].find((item) =>
    item.textContent?.includes("Risk model"),
  )!;
  await click(button);
  expect(container.textContent).toContain("0 selected");
  await rerender(page([{ ...numericModel }]));
  expect(container.textContent).toContain("0 selected");
});

const manyModels = Array.from({ length: 15 }, (_, index) => ({
  ...model,
  id: String(index + 1),
  name: `Model ${String(index + 1).padStart(2, "0")}`,
}));

async function mountPicker(models: SchemaSourceModel[]) {
  const { host: container } = await mount(<CreateSchemaPage models={models} isLoading={false} />, {
    route: "/schemas/create",
  });
  const options = () =>
    [...container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")].map(
      (button) => button.textContent,
    );
  return { container, options };
}

test("pages the model list and keeps the selection across pages", async () => {
  const { container, options } = await mountPicker(manyModels);
  expect(options()).toHaveLength(10);
  const first = [...container.querySelectorAll<HTMLButtonElement>("button[aria-pressed]")][0];
  await click(first);
  expect(first.getAttribute("aria-pressed")).toBe("true");

  await click("Next", container);
  expect(options()).toHaveLength(5);
  expect(options()[0]).toContain("Model 11");
  expect(container.textContent).toContain("1 selected");

  await click(container.querySelector('button[aria-label="Remove Model 01"]')!);
  expect(container.textContent).toContain("0 selected");
});

test("search narrows the model list and says when nothing matches", async () => {
  const { container, options } = await mountPicker(manyModels);
  const search = container.querySelector<HTMLInputElement>('input[aria-label="Search models"]')!;

  await changeValue(search, "model 12");
  expect(options()).toEqual([expect.stringContaining("Model 12")]);
  await changeValue(search, "nothing like this");
  expect(container.textContent).toContain("No matching models");
});
