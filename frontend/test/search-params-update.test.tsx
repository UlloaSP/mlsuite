// @vitest-environment jsdom

import { act } from "react";
import { useLocation } from "@tanstack/react-router";
import { expect, test } from "vite-plus/test";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { useUrlFilters } from "@/shared/lib/use-url-filters";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { mount } from "./support/dom";

let filters: ReturnType<typeof useUrlFilters<"q" | "action">>;
let setTab: (tab: "list" | "grid") => void;
let catalog: ReturnType<typeof useCatalogControls<"active" | "archived", "updated" | "name">>;

function Filters() {
  filters = useUrlFilters({ q: "", action: "all" });
  return null;
}
function Tab() {
  setTab = useSearchParamState<"list" | "grid">("view", "list")[1];
  return null;
}
function Catalog() {
  catalog = useCatalogControls({
    filters: ["active", "archived"],
    initialFilter: "active",
    initialSort: "updated",
    sorts: ["updated", "name"],
  });
  return null;
}
function Url() {
  return <output>{useLocation().searchStr}</output>;
}

const render = async (route: string) => {
  const { host } = await mount(
    <>
      <Filters />
      <Tab />
      <Catalog />
      <Url />
    </>,
    { route },
  );
  return () => new URLSearchParams(host.querySelector("output")!.textContent!);
};

test("changes made before the URL renders again all apply, from one hook or several", async () => {
  const url = await render("/log?keep=yes");

  await act(async () => {
    filters.setFilters({ q: "ada" });
    filters.setFilters({ action: "ROLE_DELETE" });
    setTab("grid");
    catalog.setSort("name");
  });

  expect(Object.fromEntries(url())).toEqual({
    keep: "yes",
    q: "ada",
    action: "ROLE_DELETE",
    view: "grid",
    sort: "name",
  });
});

test("a later render starts from the URL it shows, and defaults leave it", async () => {
  const url = await render("/log?action=ROLE_DELETE&view=grid");

  await act(async () => {
    filters.setFilters({ action: "all" });
  });
  await act(async () => {
    setTab("list");
    catalog.setFilter("archived");
  });

  expect(Object.fromEntries(url())).toEqual({ filter: "archived" });
});
