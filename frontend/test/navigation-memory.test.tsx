// @vitest-environment jsdom
import { Provider, createStore, useAtomValue } from "jotai";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { LocationBar } from "@/app/components/LocationBar";
import { LocationRail } from "@/app/components/LocationRail";
import { useScrollMemory } from "@/app/layouts/use-scroll-memory";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { BreadcrumbProvider } from "@/shared/ui/breadcrumb/BreadcrumbProvider";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { locationDisplayAtom, type LocationDisplay } from "@/shared/ui/sidebar-preferences";

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

test("the rail draws one line per breadcrumb level and names a level on focus", async () => {
  await render(
    <BreadcrumbProvider roots={roots}>
      <LocationRail side="left" />
      <AppPageHeader
        title="Page"
        breadcrumbs={[
          { label: "Schemas", to: "/schemas" },
          { label: "Risk schema", to: "/schemas/1" },
          { label: "Bookmarks" },
        ]}
      />
    </BreadcrumbProvider>,
  );
  const lines = [...container.querySelectorAll<HTMLElement>("nav[data-location-rail] li > *")];
  expect(lines.map((line) => line.getAttribute("aria-label"))).toEqual([
    "Acme",
    "Schemas",
    "Risk schema",
    "Bookmarks",
  ]);
  expect(lines[0].getAttribute("href")).toBe("/workspace");
  expect(lines[3].getAttribute("aria-current")).toBe("page");

  await act(async () => lines[2].focus());
  const card = document.body.querySelector("[data-radix-popper-content-wrapper]");
  expect(card?.textContent).toContain("Risk schema");
  expect(card?.textContent).toContain("Acme › Schemas");
});

/** What the shell does: the bottom bar only for the bottom display. */
function ShellBottom() {
  return useAtomValue(locationDisplayAtom) === "breadcrumb-bottom" ? <LocationBar /> : null;
}

test("each location display draws the trail in one place only", async () => {
  const page = (
    <BreadcrumbProvider roots={roots}>
      <AppPageHeader title="Models" />
      <ShellBottom />
    </BreadcrumbProvider>
  );
  const crumbs = () => container.querySelectorAll('nav[aria-label="Breadcrumb"]');

  const renderWith = async (display: LocationDisplay) => {
    await act(async () => root?.unmount());
    const store = createStore();
    store.set(locationDisplayAtom, display);
    await render(<Provider store={store}>{page}</Provider>);
  };

  await renderWith("breadcrumb-top");
  expect(crumbs()).toHaveLength(1);
  expect(container.querySelector("footer")).toBeNull();

  // A rail needs hover and width; jsdom has neither, so the breadcrumb stays above the title.
  await renderWith("rail-left");
  expect(crumbs()).toHaveLength(1);
  expect(container.querySelector("footer")).toBeNull();

  await renderWith("off");
  expect(crumbs()).toHaveLength(0);
  expect(container.querySelector("footer")).toBeNull();

  await renderWith("breadcrumb-bottom");
  expect(crumbs()).toHaveLength(1);
  expect(container.querySelector("footer")?.textContent).toBe("AcmeModels");
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
