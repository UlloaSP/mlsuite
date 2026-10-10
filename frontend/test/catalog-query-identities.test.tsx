// @vitest-environment jsdom
import { act } from "react";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { useInferenceCatalogPage } from "@/features/inferences/api/inference-catalog";
import { useReviewAssignmentCatalog } from "@/features/inferences/api/inference-review-catalog";
import {
  useChangeCatalog,
  useBookmarkExampleCatalog,
} from "@/features/schemas/api/schema-catalog-queries";
import { mount, click } from "./support/dom";

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 7,
}));
afterEach(() => vi.unstubAllGlobals());
const controls = { search: "", filter: "all", sort: "createdAt.desc" };
const filters = {
  query: "",
  schemaId: "all",
  bookmarkId: "all",
  status: "all",
  feedback: "all",
  origin: "all",
  conditions: [],
} as const;
const settle = async () => {
  for (let i = 0; i < 6; i++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
const cases = [
  {
    kind: "inferences",
    useCatalog: () => useInferenceCatalogPage({ ...filters, conditions: [] }, "createdAt.desc"),
    row: (id: number) => ({ item: { id } }),
  },
  {
    kind: "assignments",
    useCatalog: () => useReviewAssignmentCatalog(8, controls),
    row: (id: number) => ({ reviewRunId: "same-run", reviewer: { id } }),
  },
  {
    kind: "changes",
    useCatalog: () => useChangeCatalog("9", controls),
    row: (id: number) => ({ draft: { id } }),
  },
  {
    kind: "examples",
    useCatalog: () => useBookmarkExampleCatalog(9, true),
    row: (id: number) => ({ runId: id }),
  },
];

test.each(cases)(
  "$kind deduplicates shifted pages using the persisted identity",
  async ({ useCatalog, row }) => {
    vi.stubGlobal("fetch", async (url: string, init?: RequestInit) => {
      const page = init?.body
        ? JSON.parse(typeof init.body === "string" ? init.body : "{}").page
        : Number(new URL(url).searchParams.get("page"));
      return new Response(
        JSON.stringify({
          items: (page === 0 ? [3, 2] : [2, 1]).map((id) => row(id)),
          page,
          size: 2,
          totalItems: 4,
          hasNext: page === 0,
        }),
        { headers: { "content-type": "application/json" } },
      );
    });
    function Probe() {
      const query = useCatalog();
      return (
        <>
          <p>{query.data?.items.length ?? 0} rows</p>
          <button onClick={() => void query.fetchNextPage()}>Next</button>
        </>
      );
    }
    const { host } = await mount(<Probe />);
    await settle();
    expect(host.textContent).toContain("2 rows");
    await click("Next", host);
    await settle();
    expect(host.textContent).toContain("3 rows");
  },
);
