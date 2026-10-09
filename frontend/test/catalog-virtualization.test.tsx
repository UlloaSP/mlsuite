// @vitest-environment jsdom
import { act } from "react";
import { QueryClient } from "@tanstack/react-query";
import { Route, Routes, useNavigate } from "react-router";
import { beforeEach, afterEach, expect, test, vi } from "vite-plus/test";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { infiniteCatalogOptions, useInfiniteCatalog } from "@/shared/api/infinite-catalog";
import { useScrollMemory } from "@/app/layouts/use-scroll-memory";
import { mount } from "./support/dom";

const items = Array.from({ length: 90 }, (_, id) => ({ id, name: `Row ${id}` }));
const empty = { title: "Empty", description: "No items" };
const key = ["test", "catalog", "infinite"];
let requests: number[];
let release: (() => void) | undefined;
let delayed = false;
let navigate: ReturnType<typeof useNavigate>;
let frames: FrameRequestCallback[];
const options = () => ({
  queryKey: key,
  staleTime: Infinity,
  queryFn: async (page: number) => {
    requests.push(page);
    if (delayed && page === 0)
      await new Promise<void>((resolve) => {
        release = resolve;
      });
    return {
      items: items.slice(page * 24, (page + 1) * 24),
      page,
      size: 24,
      totalItems: 90,
      hasNext: page < 3,
    };
  },
});
function RemoteList() {
  const query = useInfiniteCatalog(options());
  return (
    <CatalogListPanel
      itemCount={query.data?.items.length ?? 0}
      isLoading={query.isLoading}
      isBusy={query.isFetching}
      hasNext={query.hasNextPage}
      errorMessage={null}
      loadingLabel="Loading"
      emptyState={empty}
      onLoadMore={query.fetchNextPage}
    >
      {query.data?.items.map((item) => (
        <button key={item.id}>{item.name}</button>
      ))}
    </CatalogListPanel>
  );
}
function RoutesWithMemory() {
  useScrollMemory();
  navigate = useNavigate();
  return (
    <Routes>
      <Route path="/list" element={<RemoteList />} />
      <Route path="/detail" element={<p>Detail</p>} />
    </Routes>
  );
}
const settle = async () => {
  for (let i = 0; i < 8; i++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
async function frame() {
  const callbacks = frames.splice(0);
  await act(async () => callbacks.forEach((callback) => callback(performance.now())));
  await settle();
}
beforeEach(() => {
  requests = [];
  release = undefined;
  delayed = false;
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return (
      Number.parseFloat((this.firstElementChild as HTMLElement | null)?.style.height ?? "0") || 300
    );
  });
});
afterEach(() => vi.unstubAllGlobals());

test("restores cold cache beyond the old one-second window and fetches enough pages", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await client.fetchInfiniteQuery({ ...infiniteCatalogOptions(options()), pages: 4 });
  const { host } = await mount(<RoutesWithMemory />, { route: "/list", queryClient: client });
  await settle();
  const list = host.querySelector<HTMLElement>("[data-scroll-memory]")!;
  await act(async () => {
    list.scrollTop = 8000;
    list.dispatchEvent(new Event("scroll"));
  });
  await act(async () => navigate("/detail"));
  client.removeQueries({ queryKey: key });
  requests = [];
  delayed = true;
  await act(async () => navigate(-1));
  await frame();
  expect(host.querySelector<HTMLElement>("[data-scroll-memory]")?.dataset.catalogRestoreTop).toBe(
    "8000",
  );
  const later = performance.now() + 2000;
  vi.spyOn(performance, "now").mockReturnValue(later);
  await frame();
  expect(host.querySelector("[data-catalog-restore-top]")).not.toBeNull();
  await act(async () => release?.());
  for (let i = 0; i < 6; i++) await frame();
  // The pages the remembered offset needs come first, in order.
  expect(requests.slice(0, 3)).toEqual([0, 1, 2]);
  const restored = host.querySelector<HTMLElement>("[data-scroll-memory]")!;
  expect(restored.scrollTop).toBe(8000);
  expect(host.querySelector("[data-catalog-restore-top]")).toBeNull();
  // A browser reports the restored offset with a scroll event; jsdom only sometimes gets there
  // through the virtualizer's own timers. Landing near the loaded end preloads the next page.
  await act(async () => restored.dispatchEvent(new Event("scroll")));
  await settle();
  expect(requests).toEqual([0, 1, 2, 3]);
  client.clear();
});

test.each([1, 2, 3])(
  "measures responsive grids with %i columns without a footer",
  async (columns) => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("1280") ? columns === 3 : columns >= 2,
      addEventListener() {},
      removeEventListener() {},
    }));
    const { host } = await mount(
      <CatalogListPanel
        layout="grid"
        scrollMemoryKey={false}
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
          <p key={item.id}>{item.name}</p>
        ))}
      </CatalogListPanel>,
    );
    const expected = document.createElement("div");
    expected.style.width = `calc((100% - ${(columns - 1) * 12}px) / ${columns})`;
    expect(host.querySelector<HTMLElement>("[data-index]")?.style.width).toBe(expected.style.width);
    expect(host.querySelector("[data-scroll-memory]")).toBeNull();
    expect(host.querySelector("footer")).toBeNull();
    expect(host.querySelectorAll("p").length).toBeLessThan(90);
  },
);

test("measures variable row heights instead of treating every row as its estimate", async () => {
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.dataset.index === "0" ? 180 : this.hasAttribute("data-index") ? 112 : 300;
  });
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
        <p key={item.id}>{item.name}</p>
      ))}
    </CatalogListPanel>,
  );
  expect(host.querySelector<HTMLElement>('[data-index="1"]')?.style.transform).toBe(
    "translateY(192px)",
  );
});

test("a list that cannot grow to its remembered offset settles instead of waiting, and input cancels", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // One page only: nothing more will load, so the saved offset is out of reach for good.
  client.setQueryData(key, {
    pages: [{ items: items.slice(0, 5), page: 0, size: 24, totalItems: 5, hasNext: false }],
    pageParams: [0],
  });
  const { host } = await mount(<RoutesWithMemory />, { route: "/list", queryClient: client });
  await settle();
  const list = () => host.querySelector<HTMLElement>("[data-scroll-memory]")!;
  await act(async () => {
    list().scrollTop = 8000;
    list().dispatchEvent(new Event("scroll"));
  });
  await act(async () => navigate("/detail"));
  await act(async () => navigate(-1));
  await frame();
  expect(frames.length).toBe(1);

  vi.spyOn(performance, "now").mockReturnValue(performance.now() + 2000);
  await frame();
  expect(frames.length).toBe(0);
  expect(host.querySelector("[data-catalog-restore-top]")).toBeNull();

  await act(async () => navigate("/detail"));
  await act(async () => navigate(-1));
  await frame();
  expect(frames.length).toBe(1);
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "PageDown", bubbles: true }));
  });
  await frame();
  expect(frames.length).toBe(0);
  client.clear();
});
