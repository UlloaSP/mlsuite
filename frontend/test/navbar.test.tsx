/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { AppShellFrame } from "@/app/layouts/AppShellLayout";
import { Navbar } from "@/app/components/navbar/Navbar";
import { SidebarProvider } from "@/app/components/app-sidebar/SidebarContext";

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

let root: Root | null = null;

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

async function render(node: React.ReactNode) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(
      <MemoryRouter initialEntries={["/home"]}>
        {node}
        <LocationProbe />
      </MemoryRouter>,
    );
  });
  return container;
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  localStorage.clear();
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
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
    expect(entries.map((entry) => entry.dataset.userGuideItem)).toEqual([
      "nav:Organizations",
      "nav:Models",
      "nav:Schemas",
      "nav:Inferences",
      "nav:Plugins",
      "nav:Review",
      "nav:Users",
      "nav:Infra",
    ]);
    expect(entries[2].getAttribute("href")).toBe("/schemas");
    expect(entries[7].tagName).toBe("BUTTON");
    expect(entries[7].getAttribute("aria-haspopup")).toBe("menu");
    expect(entries[1].getAttribute("href")).toBe("/models");
    expect(entries[1].getAttribute("aria-keyshortcuts")).toBe("Alt+2");
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
    localStorage.setItem("ui/sidebar-style", JSON.stringify("floating"));
    const container = await render(
      <SidebarProvider open={false} onOpenChange={() => undefined}>
        <Navbar position="bottom" />
      </SidebarProvider>,
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

    expect(container.querySelector('[data-testid="location"]')?.textContent).toBe("/models");
  });

  test("places the bar at the chosen edge instead of the sidebar", async () => {
    localStorage.setItem("ui/sidebar-position", JSON.stringify("bottom"));
    localStorage.setItem("ui/sidebar-style", JSON.stringify("floating"));

    const container = await render(<AppShellFrame>Content</AppShellFrame>);
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
