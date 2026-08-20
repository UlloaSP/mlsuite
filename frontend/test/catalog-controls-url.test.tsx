// @vitest-environment jsdom

import { afterEach, describe, expect, test } from "vite-plus/test";
import { createRoot, type Root } from "react-dom/client";
import { act } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
let root: Root | null = null;

function CatalogControlsProbe() {
  const location = useLocation();
  const controls = useCatalogControls({
    filters: ["active", "archived"],
    initialFilter: "active",
    initialSort: "updated",
    sorts: ["updated", "name"],
  });
  return (
    <div
      data-filter={controls.filter}
      data-page={controls.page}
      data-query={controls.query}
      data-sort={controls.sort}
      data-url={location.search}
    >
      <button type="button" onClick={() => controls.setFilter("active")}>
        default filter
      </button>
      <button type="button" onClick={() => controls.setPage(0)}>
        first page
      </button>
      <button type="button" onClick={() => controls.setQuery("next")}>
        search
      </button>
    </div>
  );
}

afterEach(() => {
  root?.unmount();
  root = null;
  document.body.innerHTML = "";
});

const render = async (entry: string) => {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <MemoryRouter initialEntries={[entry]}>
        <CatalogControlsProbe />
      </MemoryRouter>,
    );
    await flush();
  });
  return container.querySelector("div")!;
};

describe("catalog URL controls", () => {
  test("hydrates valid URL state and preserves unrelated params", async () => {
    const probe = await render("/catalog?q=risk&filter=archived&sort=name&page=3&keep=yes");

    expect(probe.dataset).toMatchObject({
      filter: "archived",
      page: "2",
      query: "risk",
      sort: "name",
    });

    await act(async () => {
      probe.querySelectorAll("button")[2]?.click();
      await flush();
    });
    expect(probe.dataset.url).toContain("q=next");
    expect(probe.dataset.url).toContain("keep=yes");
    expect(probe.dataset.url).not.toContain("page=");
  });

  test("falls back from invalid filter, sort, and page values", async () => {
    const probe = await render("/catalog?filter=unknown&sort=bad&page=-4");

    expect(probe.dataset).toMatchObject({ filter: "active", page: "0", sort: "updated" });
  });
});
