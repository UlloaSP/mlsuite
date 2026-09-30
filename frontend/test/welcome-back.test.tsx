/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { Provider, createStore } from "jotai";
import { act } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router";
import { beforeEach, expect, test, vi } from "vite-plus/test";
import { useRecordSectionLocation } from "@/app/components/section-memory";
import { useNavigationItems } from "@/app/components/use-navigation-items";
import { signInDestination } from "@/app/pages/auth-landing/sign-in-destination";
import { WelcomePage } from "@/app/pages/welcome-page";
import { visitViewState } from "@/app/components/welcome/visit-view-state";
import { BreadcrumbProvider } from "@/shared/ui/breadcrumb/BreadcrumbProvider";
import { AppPageHeader } from "@/shared/ui/PageHeader";
import { click, mount, type Mounted } from "./support/dom";

const state = vi.hoisted(() => ({ userId: "ada", canViewModels: true }));

vi.mock("@/capabilities/workspace-context/session", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/capabilities/workspace-context/session")>()),
  useUser: () => ({ data: { id: state.userId, fullName: "Ada Lovelace", systemRole: "USER" } }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useCurrentOrganizationId: () => 7,
  useWorkspaceContext: () => ({
    data: {
      currentOrganization: { id: 7, name: "Acme", slug: "acme" },
      permissions: { canViewModels: state.canViewModels, canViewPlugins: true },
    },
  }),
}));

vi.mock("@/features/schemas/api/schema-queries", () => ({
  useOrganizationBookmarks: () => ({
    data: [
      {
        id: 7,
        name: "production",
        schemaName: "Churn",
        versionName: "Baseline",
        version: 2,
        latestVersion: 3,
        models: ["Forest", "Boost", "Linear"],
        fieldCount: 114,
        runCount: 12,
        lastRunAt: null,
      },
    ],
  }),
}));
vi.mock("@/features/models/api/model.queries", () => ({
  useModel: () => ({
    data: {
      id: "3",
      name: "Risk forest",
      specificType: "RandomForestClassifier",
      fileName: "forest.joblib",
      fieldCount: 12,
      reportCount: 2,
      updatedAt: "2026-09-28T09:00:00Z",
      updatedByName: "Grace",
      archivedAt: null,
    },
  }),
}));
vi.mock("@/features/inferences/api/inference-api", () => ({
  useInference: () => ({ data: undefined }),
  useInferenceReviewAssignments: () => ({ data: undefined }),
}));

let view: Mounted;
let container: HTMLDivElement;
beforeEach(() => {
  Object.assign(state, { userId: "ada", canViewModels: true });
  localStorage.clear();
});

/** A page publishing its breadcrumb, with the shell's recorder and a way to move on. */
function Page({ title, trail }: { title: string; trail?: string }) {
  const { activeRoot } = useNavigationItems();
  useRecordSectionLocation(activeRoot);
  const navigate = useNavigate();
  return (
    <>
      <AppPageHeader
        title={title}
        breadcrumbs={[...(trail ? [{ label: trail, to: "/x" }] : []), { label: title }]}
      />
      <output>{useLocation().pathname}</output>
      <button type="button" onClick={() => void navigate("/plugins")}>
        plugins
      </button>
      <button type="button" onClick={() => void navigate("/welcome")}>
        welcome
      </button>
    </>
  );
}

async function renderApp(path: string, store = createStore()) {
  view = await mount(
    <Provider store={store}>
      <BreadcrumbProvider roots={{ organization: { label: "Acme", to: "/workspace" } }}>
        <Routes>
          <Route path="/predict/7" element={<Page title="production" trail="Predict" />} />
          <Route path="/models/3" element={<Page title="Risk forest" trail="Models" />} />
          <Route path="/plugins" element={<Page title="Plugins" />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/home" element={<p>Usual home</p>} />
        </Routes>
      </BreadcrumbProvider>
    </Provider>,
    { route: path },
  );
  container = view.host;
  return store;
}

test("signing in greets with where the member left off; new accounts and expired sessions don't", () => {
  expect(signInDestination("login", null)).toBe("/welcome");
  expect(signInDestination("register", null)).toBe("/home");
  expect(signInDestination("login", "/predict/7")).toBe("/predict/7");
  expect(signInDestination("login", "//evil.test")).toBe("/welcome");
});

const tabs = () => [...container.querySelectorAll<HTMLButtonElement>('[role="tab"]')];
const continueHref = () =>
  [...container.querySelectorAll<HTMLAnchorElement>("a")]
    .find((link) => link.textContent?.startsWith("Continue"))
    ?.getAttribute("href");

test("the welcome page opens one tab per section, most recent first, with what that page held", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-28T10:00:00Z"));
  const store = await renderApp("/models/3?sort=name&page=2");
  vi.setSystemTime(new Date("2026-09-28T11:00:00Z"));
  await view.unmount();
  await renderApp("/predict/7", store);
  await click("welcome", container);
  vi.useRealTimers();

  expect(container.querySelector("h1")?.textContent).toBe("Welcome back, Ada");
  expect(tabs().map((tab) => tab.textContent)).toEqual(["production", "Risk forest"]);
  expect(tabs()[0].getAttribute("aria-selected")).toBe("true");
  const panel = () => container.querySelector('[role="tabpanel"]')!;
  expect(panel().querySelector("h2")?.textContent).toBe("production");
  // The bookmark's own facts: what it runs and how it has been used.
  expect(panel().textContent).toContain("Churn");
  expect(panel().textContent).toContain("Baseline · v2");
  expect(panel().textContent).toContain("v3 available");
  expect(panel().textContent).toContain("Forest, Boost +1");
  expect(continueHref()).toBe("/predict/7");

  await act(async () => {
    tabs()[1].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  });
  expect(panel().querySelector("h2")?.textContent).toBe("Risk forest");
  // The model's own facts, and the view the page was left in.
  expect(panel().textContent).toContain("RandomForestClassifier");
  expect(panel().textContent).toContain("forest.joblib");
  expect(panel().textContent).toContain("by Grace");
  expect(panel().textContent).toMatch(/Sort\sName/);
  expect(panel().textContent).toMatch(/Page\s2/);
  expect(continueHref()).toBe("/models/3?sort=name&page=2");

  await click(container.querySelector('[aria-label="Forget where you were in Models"]')!);
  expect(tabs().map((tab) => tab.textContent)).toEqual(["production"]);
});

test("the saved view reads as labelled choices, leaving out ids and plumbing", () => {
  expect(visitViewState("/inferences?q=risk&status=PARTIAL_SUCCESS&schema=3&bookmark=7")).toEqual([
    { label: "Search", value: "“risk”" },
    { label: "Status", value: "Partial success" },
  ]);
  expect(visitViewState("/inferences/1?tab=reviews&reviewStatus=in-progress")).toEqual([
    { label: "Tab", value: "Reviews" },
    { label: "Review status", value: "In progress" },
  ]);
  expect(visitViewState("/models")).toEqual([]);
});

test("another member, or a section the member lost access to, has nothing to resume", async () => {
  const store = await renderApp("/models/3");
  await click("welcome", container);
  expect(tabs()).toHaveLength(1);

  state.canViewModels = false;
  await view.unmount();
  await renderApp("/welcome", store);
  expect(container.textContent).toContain("Usual home");

  state.canViewModels = true;
  state.userId = "grace";
  await view.unmount();
  await renderApp("/welcome", store);
  expect(container.textContent).toContain("Usual home");
});
