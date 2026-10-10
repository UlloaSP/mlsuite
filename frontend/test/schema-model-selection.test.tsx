// @vitest-environment jsdom
import { expect, test, vi } from "vite-plus/test";
import { CreateSchemaPage } from "@/features/schemas/pages/create-schema-page";
import { initialSchemaModels } from "@/features/schemas/lib/schema-model-selection";
import type { SchemaSourceModel } from "@/features/schemas/lib/merge";
import { click, mount } from "./support/dom";

vi.mock("@/features/schemas/api/schema-mutations", () => ({
  useCreateSchemaWithInitialVersionMutation: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));
const model: SchemaSourceModel = {
  id: 42,
  name: "Risk model",
  type: "CLASSIFIER",
  specificType: "tree",
  inputSchema: { fields: [], reports: [] },
};

test("selects requested available model only", () => {
  expect(initialSchemaModels([model], "42").map((item) => item.id)).toEqual([42]);
  expect(initialSchemaModels([model], null)).toEqual([]);
  expect(initialSchemaModels([model], "invalid")).toEqual([]);
  expect(initialSchemaModels([{ ...model, inputSchema: {} }], "42")).toEqual([]);
});

const catalog = (models: SchemaSourceModel[]) => ({
  data: { items: models, page: 0, size: 24, totalItems: models.length, hasNext: false },
  isLoading: false,
  isFetching: false,
  error: null,
  fetchNextPage: vi.fn(async () => undefined),
  refetch: vi.fn(async () => undefined),
  isFetchNextPageError: false,
});
test("keeps a requested model selected independently of loaded pages and preserves explicit deselection", async () => {
  const page = (initial: SchemaSourceModel[]) => (
    <CreateSchemaPage
      catalog={catalog([])}
      search=""
      onSearchChange={vi.fn()}
      initialModels={initial}
      isLoading={!initial.length}
    />
  );
  const { host, rerender } = await mount(page([]), { route: "/schemas/create?modelId=42" });
  await rerender(page([model]));
  expect(host.textContent).toContain("1 selected");
  await click(host.querySelector('button[aria-label="Remove Risk model"]')!);
  expect(host.textContent).toContain("0 selected");
  await rerender(page([{ ...model }]));
  expect(host.textContent).toContain("0 selected");
});
