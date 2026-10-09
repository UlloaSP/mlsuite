// @vitest-environment jsdom

import { describe, expect, test } from "vite-plus/test";
import { act } from "react";
import { useLocation } from "react-router";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { mount } from "./support/dom";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

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
      data-query={controls.query}
      data-sort={controls.sort}
      data-url={location.search}
    >
      <button type="button" onClick={() => controls.setFilter("active")}>
        default filter
      </button>
      <button type="button" onClick={() => controls.setQuery("next")}>
        search
      </button>
    </div>
  );
}

const render = async (entry: string) => {
  const { host } = await mount(<CatalogControlsProbe />, { route: entry });
  await act(flush);
  return host.querySelector("div")!;
};

describe("catalog URL controls", () => {
  test("hydrates valid URL state and preserves unrelated params", async () => {
    const probe = await render("/catalog?q=risk&filter=archived&sort=name&keep=yes");

    expect(probe.dataset).toMatchObject({
      filter: "archived",
      query: "risk",
      sort: "name",
    });

    await act(async () => {
      probe.querySelectorAll("button")[1]?.click();
      await flush();
    });
    expect(probe.dataset.url).toContain("q=next");
    expect(probe.dataset.url).toContain("keep=yes");
  });

  test("falls back from invalid filter and sort values", async () => {
    const probe = await render("/catalog?filter=unknown&sort=bad");

    expect(probe.dataset).toMatchObject({ filter: "active", sort: "updated" });
    expect(probe.dataset.url).not.toContain("filter=");
  });
});
