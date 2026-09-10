// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation, useSearchParams } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { CatalogListPanel } from "@/shared/ui/catalog/CatalogListPanel";
import { useClientCatalogPage } from "@/shared/ui/catalog/useClientCatalogPage";
import { InferenceCatalogList } from "@/features/inferences/components/InferenceCatalogList";
import { SchemaRunHistoryList } from "@/features/schemas/components/SchemaRunHistoryList";

let host: HTMLDivElement;
let root: Root;
const retry = vi.fn();
let count = 21;
let loading = false;
let error: string | null = null;
let resetKey = "org-1";

function CatalogHarness() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const items = Array.from({ length: count }, (_, index) => index + 1).filter((id) =>
    String(id).includes(query),
  );
  const pagination = useClientCatalogPage(items, `${resetKey}:${query}`, loading);
  return (
    <>
      <button onClick={() => setParams({ q: "21", page: "3" })}>Filter</button>
      <output>{useLocation().search}</output>
      <CatalogListPanel
        {...pagination}
        itemCount={items.length}
        isLoading={loading}
        isBusy={loading}
        loadingLabel="Loading"
        errorMessage={error}
        onRetry={retry}
        emptyState={{ title: "No matching inferences", description: "Change filters" }}
      >
        {pagination.visibleItems.map((id) => (
          <article key={id}>Inference {id}</article>
        ))}
      </CatalogListPanel>
    </>
  );
}

async function render(url = "/inferences") {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[url]}>
        <CatalogHarness />
      </MemoryRouter>,
    ),
  );
}
async function click(text: string) {
  const button = [...host.querySelectorAll("button")].find((item) => item.textContent === text);
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  count = 21;
  loading = false;
  error = null;
  resetKey = "org-1";
  retry.mockClear();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
});

test("paginates ten actual items, advances, returns, and disables page boundaries", async () => {
  await render();
  expect(host.querySelectorAll("article")).toHaveLength(10);
  expect(host.querySelector("article")?.textContent).toBe("Inference 1");
  await click("Next");
  expect(host.querySelector("article")?.textContent).toBe("Inference 11");
  expect(host.querySelector("output")?.textContent).toBe("?page=2");
  await click("Next");
  expect(host.querySelectorAll("article")).toHaveLength(1);
  expect(
    [...host.querySelectorAll("button")].find((item) => item.textContent === "Next")?.disabled,
  ).toBe(true);
  await click("Previous");
  expect(host.querySelector("article")?.textContent).toBe("Inference 11");
});

test("repeated navigation keeps only the current page gaps without stale ellipses", async () => {
  count = 100;
  await render();
  for (let round = 0; round < 2; round++) {
    for (const direction of ["Next", "Previous"]) {
      for (let step = 0; step < 9; step++) {
        await click(direction);
        const footer = host.querySelector("footer")!;
        const gaps = [...footer.querySelectorAll("span")].filter(
          (node) => node.textContent === "...",
        );
        expect(gaps.length).toBeLessThanOrEqual(2);
        const pages = [...footer.querySelectorAll("button")]
          .map((node) => node.textContent)
          .filter((text) => /^\d+$/.test(text ?? ""));
        expect(new Set(pages).size).toBe(pages.length);
        expect(footer.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
      }
      expect(
        [...host.querySelectorAll("footer span")].filter((node) => node.textContent === "..."),
      ).toHaveLength(1);
    }
  }
});

test("loads URL pages and resets when filters or organization change", async () => {
  await render("/inferences?page=3");
  expect(host.querySelector("article")?.textContent).toBe("Inference 21");
  await click("Filter");
  expect(host.querySelector("output")?.textContent).toBe("?q=21");
  expect(host.querySelector("article")?.textContent).toBe("Inference 21");
  resetKey = "org-2";
  await render();
  expect(host.querySelector('[aria-current="page"]')?.textContent).toBe("1");
});

test.each(["-4", "garbage", "1.2", "999"])(
  "handles invalid or out-of-range page %s",
  async (page) => {
    await render(`/inferences?page=${page}`);
    expect(host.querySelectorAll("article").length).toBeGreaterThan(0);
    expect(host.querySelector('[aria-current="page"]')?.textContent).toBe(
      page === "999" ? "3" : "1",
    );
  },
);

test("clamps to a surviving page after deletion", async () => {
  await render("/inferences?page=3");
  count = 20;
  await render();
  expect(host.querySelector("output")?.textContent).toBe("?page=2");
  expect(host.querySelector("article")?.textContent).toBe("Inference 11");
});

test("preserves requested page while loading then renders it", async () => {
  count = 0;
  loading = true;
  await render("/inferences?page=3");
  expect(host.textContent).toContain("Loading");
  expect(host.querySelector("output")?.textContent).toBe("?page=3");
  count = 21;
  loading = false;
  await render();
  expect(host.querySelector("article")?.textContent).toBe("Inference 21");
});

test("shows empty and request failure states with retry", async () => {
  count = 0;
  await render();
  expect(host.textContent).toContain("No matching inferences");
  error = "Could not load inferences.";
  await render();
  expect(host.textContent).not.toContain("No matching inferences");
  expect(host.textContent).toContain(error);
  await click("Retry");
  expect(retry).toHaveBeenCalledOnce();
});

test("renders inference and history as individual keyboard-focusable catalog entries", async () => {
  const open = vi.fn();
  await act(async () =>
    root.render(
      <MemoryRouter>
        <InferenceCatalogList
          canDelete={false}
          canManageReviews={false}
          deletePending={false}
          onDelete={vi.fn()}
          items={[
            {
              id: 1,
              name: "Organization run",
              createdByName: "Ada Lovelace",
              createdByEmail: "ada@example.com",
              schemaId: 2,
              schemaName: "Risk",
              schemaVersionId: 3,
              schemaVersion: 1,
              schemaVersionName: "First",
              bookmarkId: null,
              bookmarkName: null,
              createdAt: "2026-09-09T10:00:00Z",
              status: "PARTIAL_SUCCESS",
            },
          ]}
        />
        <SchemaRunHistoryList
          runs={[
            {
              id: "2",
              name: "Bookmark run",
              schemaVersionId: "3",
              createdAt: "2026-09-09T10:00:00Z",
              status: "SUCCESS",
              inputData: {},
              results: [],
            },
          ]}
          onOpenRun={open}
          feedbackStatusByRunId={new Map([["2", "NOT_REQUIRED"]])}
        />
      </MemoryRouter>,
    ),
  );
  expect(host.querySelectorAll("article")).toHaveLength(2);
  expect(host.querySelector("table")).toBeNull();
  expect(host.textContent).toContain("PARTIAL SUCCESS");
  expect(host.textContent).toContain("By Ada Lovelace");
  expect(host.textContent).toContain("By Unknown author");
  expect(host.textContent).toContain("Not configured");
  const entry = host.querySelectorAll("article button")[1] as HTMLButtonElement;
  entry.focus();
  expect(document.activeElement).toBe(entry);
  await act(async () => entry.click());
  expect(open).toHaveBeenCalledWith("2");
});
