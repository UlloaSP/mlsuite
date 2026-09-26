/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { WorkspaceHomePage } from "@/features/workspace/pages/workspace-home-page";

const hooks = vi.hoisted(() => ({
  useWorkspaceContext: vi.fn(),
  useOrganizationAdminDashboardQuery: vi.fn(),
}));

vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: hooks.useWorkspaceContext,
}));

vi.mock("@/features/workspace/api/workspace.queries", () => ({
  useOrganizationAdminDashboardQuery: hooks.useOrganizationAdminDashboardQuery,
}));

const fullAccess = {
  canViewMembers: true,
  canViewInvitations: true,
  canViewModels: true,
  canCreateModels: true,
  canEditModels: true,
  canReview: true,
  canManageReviews: false,
  canViewPlugins: true,
  canViewOrganization: true,
};

const context = (permissions: Record<string, boolean> = fullAccess) => ({
  currentOrganization: { id: 7, name: "Acme", slug: "acme", description: null },
  currentMembership: { role: "ADMIN" },
  memberships: Array.from({ length: 99 }, (_, id) => ({ id })),
  permissions,
});

const dashboard = {
  stats: {
    totalMembers: 12,
    totalModels: 4,
    pendingInvitations: 3,
    totalSchemas: 0,
    totalInferences: 1500,
    totalPlugins: 2,
    totalReviews: 6,
  },
  recentMembers: [
    {
      id: 1,
      fullName: "Ada Lovelace",
      email: "ada@acme.test",
      role: { name: "Maintainer" },
      createdAt: "2026-09-01T00:00:00Z",
    },
  ],
  recentInvitations: [
    {
      id: 5,
      email: "grace@acme.test",
      role: "MEMBER",
      roleDefinition: null,
      status: "PENDING",
      createdAt: "2026-09-20T00:00:00Z",
    },
  ],
};

const stageCards = (container: HTMLElement) =>
  [...container.querySelectorAll("article")].map((card) => ({
    label: card.querySelector("h3")?.textContent,
    value: card.querySelector("[aria-busy]")?.textContent,
    href: card.querySelector("h3 a")?.getAttribute("href"),
    links: [...card.querySelectorAll("a")].map((link) => link.getAttribute("href")),
  }));

describe("workspace overview", () => {
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    hooks.useWorkspaceContext.mockReset();
    hooks.useOrganizationAdminDashboardQuery.mockReset();
  });

  async function renderOverview() {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <MemoryRouter>
          <WorkspaceHomePage />
        </MemoryRouter>,
      );
    });
    return container;
  }

  test("follows the model lifecycle and suggests the next step for empty stages", async () => {
    hooks.useWorkspaceContext.mockReturnValue({ data: context() });
    hooks.useOrganizationAdminDashboardQuery.mockReturnValue({ data: dashboard });

    const container = await renderOverview();
    const cards = stageCards(container);

    expect(hooks.useOrganizationAdminDashboardQuery).toHaveBeenCalledWith(7);
    expect(cards.map(({ label, value, href }) => [label, value, href])).toEqual([
      ["Models", "4", "/models"],
      ["Schemas", "0", "/schemas"],
      ["Inferences", (1500).toLocaleString(), "/inferences"],
      ["Reviews", "6", "/review"],
    ]);
    expect(cards[1].links).toContain("/schemas/create");
    expect(cards[0].links).not.toContain("/models/create");
    expect(container.textContent).toContain("Ada Lovelace");
    expect(container.textContent).toContain("12 active");
    expect(container.textContent).toContain("grace@acme.test");
    expect(container.textContent).toContain("3 pending");
    expect(container.textContent).toContain("2 in this organization");
    expect(container.querySelector('a[href="/workspace/organizations/7/settings"]')).not.toBeNull();
    expect(container.textContent).not.toContain("99");
  });

  test("shows loading placeholders instead of zero counts", async () => {
    hooks.useWorkspaceContext.mockReturnValue({ data: context() });
    hooks.useOrganizationAdminDashboardQuery.mockReturnValue({ data: undefined });

    const container = await renderOverview();

    const busy = [...container.querySelectorAll('[aria-busy="true"]')];
    expect(busy).toHaveLength(4);
    expect(busy.every((node) => node.textContent === "Loading")).toBe(true);
    expect(container.textContent).not.toContain("active");
  });

  test("reports a failed load and retries on request", async () => {
    const refetch = vi.fn();
    hooks.useWorkspaceContext.mockReturnValue({ data: context() });
    hooks.useOrganizationAdminDashboardQuery.mockReturnValue({
      data: undefined,
      isError: true,
      refetch,
    });

    const container = await renderOverview();
    const alert = container.querySelector('[role="alert"]');

    expect(alert?.textContent).toContain("could not be loaded");
    act(() => alert?.querySelector("button")?.click());
    expect(refetch).toHaveBeenCalledOnce();
  });

  test("shows only what the member may open", async () => {
    hooks.useWorkspaceContext.mockReturnValue({
      data: context({ canManageReviews: true }),
    });
    hooks.useOrganizationAdminDashboardQuery.mockReturnValue({ data: dashboard });

    const container = await renderOverview();

    expect(stageCards(container).map(({ label }) => label)).toEqual(["Reviews"]);
    expect(container.textContent).not.toContain("Newest members");
    expect(container.textContent).not.toContain("Latest invitations");
    expect(container.querySelector('a[href="/plugins"]')).toBeNull();
    expect(container.textContent).not.toContain("Settings");
  });
});
