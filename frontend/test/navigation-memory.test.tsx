// @vitest-environment jsdom
import { act } from "react";
import { useLocation, useNavigate, useRouter } from "@tanstack/react-router";
import { useSelector } from "@tanstack/react-store";
import { afterEach, expect, test, vi } from "vite-plus/test";
import { LocationBar } from "@/app/components/LocationBar";
import { LocationRail } from "@/app/components/LocationRail";
import { RESTORE_SCROLL_STATE, useScrollMemory } from "@/app/layouts/use-scroll-memory";
import { useRecordSectionLocation } from "@/app/components/section-memory";
import { useNavigationItems } from "@/app/components/use-navigation-items";
import { appHref } from "@/shared/lib/app-href";
import { useSearchParamState } from "@/shared/lib/use-search-param-state";
import { BreadcrumbProvider } from "@/shared/ui/breadcrumb/BreadcrumbProvider";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { locationDisplayAtom, type LocationDisplay } from "@/shared/ui/sidebar-preferences";
import { click, mount, type Mounted } from "./support/dom";

const workspace = vi.hoisted(() => ({ organizationId: 7 }));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({ data: { id: "user-1", systemRole: "USER" } }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({
    data: {
      currentOrganization: { id: workspace.organizationId, name: "Acme", slug: "acme" },
      permissions: { canViewModels: true },
    },
  }),
}));

let view: Mounted | undefined;
let container: HTMLDivElement;
afterEach(() => {
  locationDisplayAtom.set("breadcrumb-top");
  localStorage.clear();
  workspace.organizationId = 7;
  vi.unstubAllGlobals();
});

async function render(
  node: React.ReactNode,
  route = "/",
  routes?: Record<string, React.ReactNode>,
) {
  view = await mount(node, { route, routes });
  container = view.host;
}

test("the rail draws one line per breadcrumb level and names a level on focus", async () => {
  await render(
    <BreadcrumbProvider>
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
    "Schemas",
    "Risk schema",
    "Bookmarks",
  ]);
  expect(lines[0].getAttribute("href")).toBe("/schemas");
  expect(lines[2].getAttribute("aria-current")).toBe("page");

  await act(async () => lines[1].focus());
  const card = document.body.querySelector("[data-radix-popper-content-wrapper]");
  expect(card?.textContent).toContain("Risk schema");
  expect(card?.textContent).toContain("Schemas");
});

/** What the shell does: the bottom bar only for the bottom display. */
function ShellBottom() {
  return useSelector(locationDisplayAtom) === "breadcrumb-bottom" ? <LocationBar /> : null;
}

test("each location display draws the trail in one place only", async () => {
  const page = (
    <BreadcrumbProvider>
      <AppPageHeader
        title="Risk model"
        breadcrumbs={[{ label: "Models", to: "/models" }, { label: "Risk model" }]}
      />
      <ShellBottom />
    </BreadcrumbProvider>
  );
  const crumbs = () => container.querySelectorAll('nav[aria-label="Breadcrumb"]');

  const renderWith = async (display: LocationDisplay) => {
    await view?.unmount();
    locationDisplayAtom.set(display);
    await render(page);
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
  expect(container.querySelector("footer")?.textContent).toBe("ModelsRisk model");
});

function TabProbe() {
  const [tab, setTab] = useSearchParamState("tab", "inputs", ["inputs", "outputs"] as const);
  const location = useLocation();
  return (
    <>
      <output>{`${tab}|${location.searchStr}`}</output>
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
  await render(<TabProbe />, "/run?tab=bogus");
  const output = () => container.querySelector("output")!.textContent;
  expect(output()).toBe("inputs|?tab=bogus");
  await click(container.querySelectorAll("button")[0]);
  expect(output()).toBe("outputs|?tab=outputs");
  await click(container.querySelectorAll("button")[1]);
  expect(output()).toBe("inputs|");
});

function ScrollPage({ name }: { name: string }) {
  const navigate = useNavigate();
  const { history } = useRouter();
  return (
    <div>
      <div data-scroll-memory="page" data-testid={name} />
      <button type="button" onClick={() => void navigate(appHref("/b"))}>
        forward
      </button>
      <button type="button" onClick={() => history.back()}>
        back
      </button>
    </div>
  );
}

/** What the shell does around the page the router shows. */
function Shell() {
  useScrollMemory();
  return null;
}

test("page scroll comes back on back navigation, not on a new visit", async () => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
  await render(<Shell />, "/a", { "/a": <ScrollPage name="a" />, "/b": <ScrollPage name="b" /> });
  const scroller = () => container.querySelector<HTMLElement>('[data-scroll-memory="page"]')!;

  scroller().scrollTop = 480;
  await act(async () => scroller().dispatchEvent(new Event("scroll")));
  await click(container.querySelectorAll("button")[0]);
  expect(scroller().dataset.testid).toBe("b");
  expect(scroller().scrollTop).toBe(0);

  await click(container.querySelectorAll("button")[1]);
  expect(scroller().dataset.testid).toBe("a");
  expect(scroller().scrollTop).toBe(480);
});

/** What the shell does: record the section location; the nav lists where each entry goes. */
function SectionShell() {
  const { navigation, activeRoot } = useNavigationItems();
  useRecordSectionLocation(activeRoot);
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <>
      <output>{`${location.pathname}${location.searchStr}`}</output>
      {navigation.map((item) => (
        <button
          key={item.root}
          type="button"
          data-root={item.root}
          onClick={() => void navigate(appHref(item.to))}
        >
          {item.to}
        </button>
      ))}
    </>
  );
}

test("each navigation section resumes where the member left it, per organization", async () => {
  await render(<SectionShell />, "/predict/7?from=3");
  const entry = (root: string) =>
    container.querySelector<HTMLButtonElement>(`[data-root="${root}"]`)!;

  // Inside Predict its entry leads to the start of the section.
  expect(entry("/predict").textContent).toBe("/predict");
  await click(entry("/models"));
  expect(container.querySelector("output")?.textContent).toBe("/models");
  expect(entry("/predict").textContent).toBe("/predict/7?from=3");

  await click(entry("/predict"));
  expect(container.querySelector("output")?.textContent).toBe("/predict/7?from=3");
  expect(entry("/models").textContent).toBe("/models");

  // Another organization's pages would not resolve: it starts fresh.
  workspace.organizationId = 8;
  await click(entry("/schemas"));
  expect(entry("/predict").textContent).toBe("/predict");
});

function SectionScrollPage({ name }: { name: string }) {
  const navigate = useNavigate();
  const other = name === "a" ? "/b" : "/a";
  return (
    <div>
      <div data-scroll-memory="page" data-testid={name} />
      <button type="button" onClick={() => void navigate(appHref(other))}>
        visit
      </button>
      <button
        type="button"
        onClick={() => void navigate({ ...appHref(other), state: RESTORE_SCROLL_STATE })}
      >
        resume
      </button>
    </div>
  );
}

test("returning to a section restores its scroll; a plain visit starts at the top", async () => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0);
    return 0;
  });
  vi.spyOn(HTMLElement.prototype, "scrollHeight", "get").mockReturnValue(2000);
  await render(<Shell />, "/a", {
    "/a": <SectionScrollPage name="a" />,
    "/b": <SectionScrollPage name="b" />,
  });
  const scroller = () => container.querySelector<HTMLElement>('[data-scroll-memory="page"]')!;

  scroller().scrollTop = 320;
  await act(async () => scroller().dispatchEvent(new Event("scroll")));
  await click("visit", container);
  expect(scroller().dataset.testid).toBe("b");
  await click("visit", container);
  expect(scroller().dataset.testid).toBe("a");
  expect(scroller().scrollTop).toBe(0);

  scroller().scrollTop = 320;
  await act(async () => scroller().dispatchEvent(new Event("scroll")));
  await click("visit", container);
  await click("resume", container);
  expect(scroller().dataset.testid).toBe("a");
  expect(scroller().scrollTop).toBe(320);
});
