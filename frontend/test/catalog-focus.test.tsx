// @vitest-environment jsdom
import { act } from "react";
import { expect, test, vi } from "vite-plus/test";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { mount, changeValue } from "./support/dom";
const items = Array.from({ length: 90 }, (_, id) => ({ id, name: `Row ${id}` }));
const empty = { title: "Empty", description: "No items" };
const settle = async () => {
  for (let i = 0; i < 6; i++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
test("keeps a focused edited row mounted while virtual scrolling past it", async () => {
  const { host } = await mount(
    <CatalogListPanel
      itemCount={90}
      isBusy={false}
      isLoading={false}
      hasNext={false}
      errorMessage={null}
      loadingLabel="Loading"
      emptyState={empty}
      onLoadMore={vi.fn()}
    >
      {items.map((item) => (
        <input key={item.id} aria-label={item.name} defaultValue={item.name} />
      ))}
    </CatalogListPanel>,
  );
  const input = host.querySelector<HTMLInputElement>('input[aria-label="Row 0"]')!;
  await act(async () => input.focus());
  await changeValue(input, "Unsaved edit");
  const list = host.querySelector<HTMLElement>("[data-scroll-memory]")!;
  await act(async () => {
    list.scrollTop = 7000;
    list.dispatchEvent(new Event("scroll"));
  });
  await settle();
  expect(host.querySelector('input[aria-label="Row 0"]')).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(input.value).toBe("Unsaved edit");
  expect(host.querySelectorAll("input").length).toBeLessThan(24);
});

test("preserves focus and edits when a card moves from three to two columns", async () => {
  const listeners: (() => void)[] = [];
  const wide = {
    matches: true,
    addEventListener: (_type: string, listener: () => void) => listeners.push(listener),
    removeEventListener() {},
  };
  const medium = { ...wide, matches: true };
  vi.stubGlobal("matchMedia", (query: string) => (query.includes("1280") ? wide : medium));
  const { host } = await mount(
    <CatalogListPanel
      layout="grid"
      itemCount={90}
      isBusy={false}
      isLoading={false}
      hasNext={false}
      errorMessage={null}
      loadingLabel="Loading"
      emptyState={empty}
      onLoadMore={vi.fn()}
    >
      {items.map((item) => (
        <input key={item.id} aria-label={item.name} defaultValue={item.name} />
      ))}
    </CatalogListPanel>,
  );
  const input = host.querySelector<HTMLInputElement>('input[aria-label="Row 2"]')!;
  await act(async () => input.focus());
  await changeValue(input, "Still editing");
  await act(async () => {
    wide.matches = false;
    listeners.forEach((listener) => listener());
  });
  expect(host.querySelector('input[aria-label="Row 2"]')).toBe(input);
  expect(input.value).toBe("Still editing");
  expect(document.activeElement).toBe(input);
  expect(input.parentElement?.dataset.index).toBe("1");
});

test("keeps the edited identity mounted when a refetch moves it beyond the visible range", async () => {
  const list = (rows: typeof items) => (
    <CatalogListPanel
      itemCount={rows.length}
      isBusy={false}
      isLoading={false}
      hasNext={false}
      errorMessage={null}
      loadingLabel="Loading"
      emptyState={empty}
      onLoadMore={vi.fn()}
    >
      {rows.map((item) => (
        <input key={item.id} aria-label={item.name} defaultValue={item.name} />
      ))}
    </CatalogListPanel>
  );
  const view = await mount(list(items));
  const input = view.host.querySelector<HTMLInputElement>('input[aria-label="Row 0"]')!;
  await act(async () => input.focus());
  await changeValue(input, "Unsaved after refresh");
  await view.rerender(list([...items.slice(1), items[0]!]));
  await settle();
  expect(view.host.querySelector('input[aria-label="Row 0"]')).toBe(input);
  expect(document.activeElement).toBe(input);
  expect(input.value).toBe("Unsaved after refresh");
  expect(view.host.querySelectorAll("input").length).toBeLessThan(24);
});
