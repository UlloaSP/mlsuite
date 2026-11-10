// @vitest-environment jsdom

import { act, useEffect, useState } from "react";
import { getRouteApi, useLocation } from "@tanstack/react-router";
import { describe, expect, test } from "vite-plus/test";
import { useSearchText } from "@/shared/lib/use-search-text";
import { useSearchUpdate } from "@/shared/lib/use-search-update";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { changeValue, mount, searchDelay } from "./support/dom";

const route = getRouteApi("/protected/app/superadmin/admin/api-traffic");
type TrafficSearch = ReturnType<typeof route.useSearch>;

let update: (change: Partial<TrafficSearch>) => void;
let searched: string[] = [];
let urls: string[] = [];

/** A catalog's search box, what it asks the server for, and every URL it has shown. */
function Catalog() {
  const controls = useCatalogControls(route.useSearch());
  const location = useLocation();
  const current = useSearchUpdate<TrafficSearch>();
  useEffect(() => {
    update = current;
  });
  useEffect(() => {
    searched.push(controls.search);
  }, [controls.search]);
  useEffect(() => {
    urls.push(location.searchStr);
  }, [location.searchStr]);
  return (
    <input
      aria-label="Search"
      value={controls.query}
      onChange={(event) => controls.setQuery(event.target.value)}
    />
  );
}

const box = () => document.querySelector<HTMLInputElement>('input[aria-label="Search"]')!;
const type = async (...values: string[]) => {
  for (const value of values) await changeValue(box(), value);
};

describe("a search box kept in the URL", () => {
  const open = async (entry = "/admin/api-traffic") => {
    searched = [];
    urls = [];
    await mount(<Catalog />, { route: entry });
  };

  test("shows every key at once and asks the server once, after the pause", async () => {
    await open();

    await type("a", "ad", "ada");

    expect(box().value).toBe("ada");
    expect(urls).toEqual([""]);
    expect(searched).toEqual([""]);

    await searchDelay();

    expect(box().value).toBe("ada");
    expect(urls).toEqual(["", "?q=ada"]);
    expect(searched).toEqual(["", "ada"]);
  });

  test("applies a cleared search at once", async () => {
    await open("/admin/api-traffic?q=ada");

    await type("");
    await act(async () => undefined);

    expect(urls.at(-1)).toBe("");
    expect(searched.at(-1)).toBe("");
  });

  test("takes a search the URL gets from elsewhere", async () => {
    await open("/admin/api-traffic?q=ada");

    await act(async () => update({ q: "grace" }));

    expect(box().value).toBe("grace");
    expect(searched.at(-1)).toBe("grace");
  });
});

/** A URL that shows a written value only after a while, as a busy router would. */
function SlowUrl({ delayMs }: { delayMs: number }) {
  const [value, setValue] = useState("");
  const search = useSearchText(value, (next) => {
    setTimeout(() => setValue(next), delayMs);
  });
  return (
    <>
      <output>{value}</output>
      <input
        aria-label="Search"
        value={search.text}
        onChange={(event) => search.setText(event.target.value)}
      />
    </>
  );
}

test("keeps the keys typed while its own earlier search reaches the URL", async () => {
  await mount(<SlowUrl delayMs={100} />);

  await type("ab");
  await searchDelay();
  await type("abc");
  await act(async () => new Promise((resolve) => setTimeout(resolve, 120)));

  expect(document.querySelector("output")?.textContent).toBe("ab");
  expect(box().value).toBe("abc");

  await searchDelay();
  await act(async () => new Promise((resolve) => setTimeout(resolve, 120)));

  expect(document.querySelector("output")?.textContent).toBe("abc");
  expect(box().value).toBe("abc");
});

test("a catalog list keeps its rows for new criteria and starts again at the top", async () => {
  const list = (resetKey: string) => (
    <CatalogListPanel
      emptyState={{ title: "Nothing", description: "Nothing yet." }}
      errorMessage={null}
      hasNext={false}
      isBusy={resetKey === "risk"}
      isLoading={false}
      itemCount={2}
      loadingLabel="Loading…"
      resetKey={resetKey}
      onLoadMore={() => undefined}
    >
      <p key="1">Case 1</p>
      <p key="2">Case 2</p>
    </CatalogListPanel>
  );
  const { host, rerender } = await mount(list(""));
  const scroller = host.querySelector<HTMLElement>("[data-scroll-memory]")!;
  const row = host.querySelector("li");
  scroller.scrollTop = 200;

  await rerender(list("risk"));

  expect(host.querySelector("li")).toBe(row);
  expect(host.textContent).toContain("Case 2");
  expect(scroller.scrollTop).toBe(0);
});
