// @vitest-environment jsdom
import { act, useState } from "react";
import { QueryClient } from "@tanstack/react-query";
import { beforeEach, afterEach, expect, test, vi } from "vite-plus/test";
import { ReviewSelectionCatalog } from "@/capabilities/review-creation/ReviewSelectionCatalog";
import * as http from "@/shared/api/http";
import { changeValue, click, mount } from "./support/dom";
import { catalogViewport } from "./support/catalog-viewport";
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 42,
}));
const all = Array.from({ length: 83 }, (_, i) => ({
  id: String(i + 1),
  title: `Person ${i + 1}`,
  detail: i % 2 ? "Other" : "Matching",
}));
beforeEach(catalogViewport);
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
function Harness() {
  const [selected, setSelected] = useState(new Set<number>());
  return (
    <ReviewSelectionCatalog
      organizationId={42}
      title="Reviewers"
      emptyDescription="No entries"
      source={{ kind: "reviewers" }}
      idFromString={Number}
      selectedIds={selected}
      onClear={() => setSelected(new Set())}
      onSelectAll={(ids) => setSelected(new Set(ids))}
      onToggle={(id) => setSelected((current) => new Set([...current, id]))}
    />
  );
}
const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
test("selects all matching identities beyond loaded pages and preserves selections outside the search", async () => {
  const request = vi.spyOn(http, "appFetch").mockImplementation(async (url, init) => {
    const body = JSON.parse(String(init?.body));
    const matching = all.filter((item) => `${item.title} ${item.detail}`.includes(body.search));
    if (String(url).endsWith("/ids")) return matching.map((item) => item.id);
    const start = body.page * 24;
    return {
      items: matching.slice(start, start + 24),
      page: body.page,
      size: 24,
      totalItems: matching.length,
      totalAvailable: all.length,
      hasNext: start + 24 < matching.length,
    };
  });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const { host } = await mount(<Harness />, { queryClient: qc });
  await flush();
  expect(host.textContent).not.toContain("Person 83");
  expect(host.querySelector("footer")).toBeNull();
  const person = [...host.querySelectorAll("button")].find((item) =>
    item.textContent?.includes("Person 2"),
  )!;
  await click(person);
  await changeValue(host.querySelector("input")!, "Matching");
  await flush();
  await click("Select results", host);
  await flush();
  expect(host.textContent).toContain("43 of");
  expect(request.mock.calls.some(([url]) => String(url).endsWith("/ids"))).toBe(true);
  await click("Clear", host);
  expect(host.textContent).toContain("0 of");
  qc.clear();
});
