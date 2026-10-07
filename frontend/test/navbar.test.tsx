/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { Provider, createStore } from "jotai";
import { navigationPositionAtom, sidebarStyleAtom } from "@/shared/ui/sidebar-preferences";
import { act } from "react";
import { useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { AppShellFrame } from "@/app/layouts/AppShellLayout";
import { SidebarNavigation } from "@/app/components/SidebarNavigation";
import { Navbar } from "@/app/components/navbar/Navbar";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";
import { mount } from "./support/dom";

vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => ({
    data: {
      userName: "ada",
      fullName: "Ada",
      email: "ada@acme.test",
      avatarUrl: null,
      systemRole: "SUPERADMIN",
    },
  }),
  useLogout: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => ({
    data: {
      currentOrganization: { id: 7, name: "Acme", slug: "acme" },
      organizations: [{ id: 7, name: "Acme", slug: "acme" }],
      permissions: {
        canViewModels: true,
        canViewPlugins: true,
        canReview: true,
        canViewWorkspace: true,
      },
    },
  }),
}));
vi.mock("@/features/workspace/api/workspace.queries", () => ({
  usePendingInvitations: () => ({ data: [] }),
}));
vi.mock("@/features/workspace/api/workspace.mutations", () => ({
  useSelectOrganization: () => ({ mutateAsync: vi.fn() }),
}));
vi.mock("@/app/components/AppGlobalSearch", () => ({ AppGlobalSearch: () => null }));

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

async function render(node: React.ReactNode, store = createStore()) {
  const { host } = await mount(
    <Provider store={store}>
      {node}
      <LocationProbe />
    </Provider>,
    { route: "/home" },
  );
  return host;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("navigation bar", () => {
  test("lists the same entries as the sidebar, with menus for sections that have children", async () => {
    const container = await render(
      <SidebarProvider open onOpenChange={() => undefined}>
        <Navbar position="top" />
      </SidebarProvider>,
    );

    const nav = container.querySelector('nav[aria-label="Main navigation"]')!;
    const entries = [...nav.querySelectorAll<HTMLElement>("[data-user-guide-item]")];
    // The public feed first, then the organization's work and platform administration,
    // each after a divider.
    expect(entries.map((entry) => entry.dataset.userGuideItem)).toEqual([
      "nav:Explore",
      "nav:Predict",
      "nav:Models",
      "nav:Schemas",
      "nav:Inferences",
      "nav:Plugins",
      "nav:Review",
      "nav:Organizations",
      "nav:Users",
      "nav:Moderation",
      "nav:Infra",
    ]);
    expect(entries[1].previousElementSibling?.getAttribute("aria-hidden")).toBe("true");
    expect(entries[7].previousElementSibling?.getAttribute("aria-hidden")).toBe("true");
    expect(nav.querySelectorAll(":scope > span[aria-hidden='true']")).toHaveLength(2);
    expect(entries[3].getAttribute("href")).toBe("/schemas");
    expect(entries[9].getAttribute("href")).toBe("/admin/public-bookmarks");
    expect(entries[10].tagName).toBe("BUTTON");
    expect(entries[10].getAttribute("aria-haspopup")).toBe("menu");
    expect(entries[0].getAttribute("href")).toBe("/explore");
    expect(entries[0].getAttribute("aria-keyshortcuts")).toBe("Alt+1");
    expect(entries[1].getAttribute("href")).toBe("/predict");
    expect(entries[7].getAttribute("aria-keyshortcuts")).toBe("Alt+8");
    for (const item of [
      "brand",
      "workspace-switcher",
      "global-search",
      "user-guide",
      "user-menu",
    ]) {
      expect(container.querySelector(`[data-user-guide-item="${item}"]`)).not.toBeNull();
    }
  });

  test("follows the shared collapsed state and points menus toward the screen", async () => {
    const store = createStore();
    store.set(sidebarStyleAtom, "floating");
    const container = await render(
      <SidebarProvider open={false} onOpenChange={() => undefined}>
        <Navbar position="bottom" />
      </SidebarProvider>,
      store,
    );

    const bar = container.querySelector<HTMLElement>("header")!;
    expect(bar.dataset.state).toBe("collapsed");
    expect([...bar.classList]).toEqual(expect.arrayContaining(["self-center", "mb-2", "w-fit"]));
    expect(bar.classList.contains("w-[calc(100%-1rem)]")).toBe(false);
    const infra = container.querySelector('[data-user-guide-item="nav:Infra"]')!;
    const label = infra.querySelector("span")!;
    expect(label.textContent).toBe("Infra");
    expect(label.classList.contains("max-w-0")).toBe(true);
    expect(label.classList.contains("lg:max-w-56")).toBe(false);
    expect(infra.querySelector(".lucide-chevron-up")).not.toBeNull();
    expect(infra.querySelector(".lucide-chevron-down")).toBeNull();
  });

  test("the sidebar splits the public feed, the organization's work and platform administration", async () => {
    const container = await render(
      <SidebarProvider open onOpenChange={() => undefined}>
        <SidebarNavigation />
      </SidebarProvider>,
    );

    const group = (label: string) =>
      [
        ...container
          .querySelector(`ul[aria-label="${label}"]`)!
          .querySelectorAll("[data-user-guide-item^='nav:']"),
      ].map((item) => item.getAttribute("data-user-guide-item"));
    expect(
      [...container.querySelectorAll("ul[aria-label]")].map((list) =>
        list.getAttribute("aria-label"),
      ),
    ).toEqual(["Public", "Workspace", "Administration"]);
    expect(group("Public")).toEqual(["nav:Explore"]);
    expect(group("Workspace")).toEqual([
      "nav:Predict",
      "nav:Models",
      "nav:Schemas",
      "nav:Inferences",
      "nav:Plugins",
      "nav:Review",
    ]);
    expect(group("Administration")).toEqual([
      "nav:Organizations",
      "nav:Users",
      "nav:Moderation",
      "nav:Infra",
    ]);
    expect(
      container
        .querySelector('[data-user-guide-item="nav:Organizations"]')
        ?.getAttribute("aria-keyshortcuts"),
    ).toBe("Alt+8");
  });

  test("opens entries with Alt+number", async () => {
    const container = await render(
      <SidebarProvider open onOpenChange={() => undefined}>
        <Navbar position="bottom" />
      </SidebarProvider>,
    );

    act(() => {
      window.dispatchEvent(
        new KeyboardEvent("keydown", { altKey: true, code: "Digit2", key: "2" }),
      );
    });

    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/predict");
  });

  test("places the bar at the chosen edge instead of the sidebar", async () => {
    // Stored preferences are read once, when the module loads; set them on the store.
    const store = createStore();
    store.set(navigationPositionAtom, "bottom");
    store.set(sidebarStyleAtom, "floating");

    const container = await render(<AppShellFrame>Content</AppShellFrame>, store);
    const shell = container.querySelector<HTMLElement>("[data-navigation-position]")!;
    const bar = shell.querySelector("header[data-app-sidebar]")!;

    expect(shell.dataset.navigationPosition).toBe("bottom");
    // Hidden overflow can still be scrolled by the browser and cut off page headers.
    expect(shell.classList.contains("overflow-clip")).toBe(true);
    expect(
      shell.querySelector(".app-content-transition")?.classList.contains("overflow-clip"),
    ).toBe(true);
    expect(shell.classList.contains("flex-col")).toBe(true);
    expect(shell.classList.contains("[--app-nav-block:4rem]")).toBe(true);
    expect(bar.getAttribute("data-position")).toBe("bottom");
    expect(shell.lastElementChild).toBe(bar);
    expect(shell.querySelector("aside")).toBeNull();
    expect(container.querySelector('button[aria-label="Expand sidebar"]')).toBeNull();
  });
});
