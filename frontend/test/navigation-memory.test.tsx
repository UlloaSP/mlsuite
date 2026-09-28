// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { SidebarLocationTree } from "@/app/components/SidebarLocationTree";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { useScrollMemory } from "@/app/layouts/use-scroll-memory";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { BreadcrumbProvider } from "@/shared/ui/breadcrumb/BreadcrumbProvider";
import { AppPageHeader } from "@/shared/ui/PageHeader";

let root: Root | undefined;
let container: HTMLDivElement;
afterEach(async () => {
  await act(async () => root?.unmount());
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

async function render(node: React.ReactNode, entries = ["/"]) {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<MemoryRouter initialEntries={entries}>{node}</MemoryRouter>));
}

const roots = { organization: { label: "Acme", to: "/workspace" } };

test("the sidebar shows the page trail below the organization as a tree", async () => {
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }));
  const page = (levels: { label: string; to?: string }[]) => (
    <BreadcrumbProvider roots={roots}>
      <SidebarProvider open onOpenChange={() => undefined}>
        <SidebarLocationTree />
        <AppPageHeader title="Page" breadcrumbs={levels} />
      </SidebarProvider>
    </BreadcrumbProvider>
  );
  await render(page([{ label: "Models" }]));
  expect(container.querySelector('[aria-label="Current location"]')).toBeNull();

  await act(async () =>
    root?.render(
      <MemoryRouter>
        {page([
          { label: "Schemas", to: "/schemas" },
          { label: "Risk schema", to: "/schemas/1" },
          { label: "Bookmarks" },
        ])}
      </MemoryRouter>,
    ),
  );
  const tree = container.querySelector('[aria-label="Current location"]')!;
  expect([...tree.querySelectorAll("li")].map((level) => level.textContent)).toEqual([
    "Schemas",
    "Risk schema",
    "Bookmarks",
  ]);
  expect(tree.querySelector('[aria-current="page"]')?.textContent).toBe("Bookmarks");
  expect(tree.querySelector("a")?.getAttribute("href")).toBe("/schemas");
});

function TabProbe() {
  const [tab, setTab] = useSearchParamState("tab", "inputs", ["inputs", "outputs"] as const);
  const location = useLocation();
  return (
    <>
      <output>{`${tab}|${location.search}`}</output>
      <button type="button" onClick={() => setTab("outputs")}>
        outputs
      </button>
      <button type="button" onClick={() => setTab("inputs")}>
        inputs
      </button>
    </>
  );
}

test("view choices live in the URL, with the default left out and unknown values ignored", async () => {
  await render(<TabProbe />, ["/run?tab=bogus"]);
  const output = () => container.querySelector("output")!.textContent;
  expect(output()).toBe("inputs|?tab=bogus");
  await act(async () => container.querySelectorAll("button")[0].click());
  expect(output()).toBe("outputs|?tab=outputs");
  await act(async () => container.querySelectorAll("button")[1].click());
  expect(output()).toBe("inputs|");
});

function ScrollPage({ name }: { name: string }) {
  const navigate = useNavigate();
  return (
    <div>
      <div data-scroll-memory="page" data-testid={name} />
      <button type="button" onClick={() => void navigate("/b")}>
        forward
      </button>
      <button type="button" onClick={() => void navigate(-1)}>
        back
      </button>
    </div>
  );
}

function Shell() {
  useScrollMemory();
  return (
    <Routes>
      <Route path="/a" element={<ScrollPage name="a" />} />
      <Route path="/b" element={<ScrollPage name="b" />} />
    </Routes>
  );
}

test("page scroll comes back on back navigation, not on a new visit", async () => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
  await render(<Shell />, ["/a"]);
  const scroller = () => container.querySelector<HTMLElement>('[data-scroll-memory="page"]')!;

  scroller().scrollTop = 480;
  await act(async () => scroller().dispatchEvent(new Event("scroll")));
  await act(async () => container.querySelectorAll("button")[0].click());
  expect(scroller().dataset.testid).toBe("b");
  expect(scroller().scrollTop).toBe(0);

  await act(async () => container.querySelectorAll("button")[1].click());
  expect(scroller().dataset.testid).toBe("a");
  expect(scroller().scrollTop).toBe(480);
});
