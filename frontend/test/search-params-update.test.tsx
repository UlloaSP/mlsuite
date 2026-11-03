// @vitest-environment jsdom

import { act } from "react";
import { getRouteApi, useLocation } from "@tanstack/react-router";
import { expect, test } from "vite-plus/test";
import { useSearchUpdate } from "@/shared/lib/use-search-update";
import { useCatalogControls } from "@/shared/ui/catalog/useCatalogControls";
import { mount } from "./support/dom";

// The platform's traffic page: a tab and a period beside its clients catalog's params.
const route = getRouteApi("/protected/app/superadmin/admin/api-traffic");

type TrafficSearch = ReturnType<typeof route.useSearch>;
let update: (change: Partial<TrafficSearch>) => void;
let catalog: ReturnType<typeof useCatalogControls<TrafficSearch["filter"], TrafficSearch["sort"]>>;

function View() {
  update = useSearchUpdate<TrafficSearch>();
  return null;
}
function Catalog() {
  catalog = useCatalogControls(route.useSearch());
  return null;
}
function Url() {
  return <output>{useLocation().searchStr}</output>;
}

const render = async (entry: string) => {
  const { host } = await mount(
    <>
      <View />
      <Catalog />
      <Url />
    </>,
    { route: entry },
  );
  return () => new URLSearchParams(host.querySelector("output")!.textContent!);
};

test("changes made before the URL renders again all apply, from one hook or several", async () => {
  const url = await render("/admin/api-traffic");

  await act(async () => {
    catalog.setQuery("ada");
    update({ tab: "clients" });
    update({ period: "week" });
    catalog.setSort("name");
  });

  expect(Object.fromEntries(url())).toEqual({
    q: "ada",
    tab: "clients",
    period: "week",
    sort: "name",
  });
});

test("a later render starts from the URL it shows, and fallbacks leave it", async () => {
  const url = await render("/admin/api-traffic?tab=clients&period=week");

  await act(async () => {
    update({ period: "day" });
  });
  await act(async () => {
    update({ tab: "overview" });
    catalog.setFilter("suspended");
  });

  expect(Object.fromEntries(url())).toEqual({ filter: "suspended" });
});

test("a value the page does not know reads as its fallback and leaves with the next change", async () => {
  const url = await render("/admin/api-traffic?tab=bogus&filter=unknown&sort=bad");

  expect(catalog).toMatchObject({ filter: "all", sort: "updated" });
  await act(async () => {
    catalog.setQuery("next");
  });

  expect(Object.fromEntries(url())).toEqual({ q: "next" });
});
