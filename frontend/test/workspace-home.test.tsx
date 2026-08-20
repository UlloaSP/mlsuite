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

const context = {
  currentOrganization: { id: 7, name: "Acme", slug: "acme" },
  currentMembership: { role: "MEMBER" },
  memberships: Array.from({ length: 99 }, (_, id) => ({ id })),
  permissions: {
    canViewMembers: true,
    canViewModels: true,
    canManageInvitations: true,
    canViewPlugins: false,
  },
};

function statValue(container: HTMLElement, label: string) {
  const labelNode = [...container.querySelectorAll("p")].find((node) => node.textContent === label);
  return labelNode?.nextElementSibling?.textContent;
}

describe("workspace home", () => {
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    hooks.useWorkspaceContext.mockReset();
    hooks.useOrganizationAdminDashboardQuery.mockReset();
  });

  async function renderHome() {
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

  test("uses organization dashboard metrics without workspace invitations", async () => {
    hooks.useWorkspaceContext.mockReturnValue({ data: context });
    hooks.useOrganizationAdminDashboardQuery.mockReturnValue({
      data: {
        stats: {
          totalMembers: 12,
          totalModels: 4,
          pendingInvitations: 3,
        },
      },
    });

    const container = await renderHome();

    expect(statValue(container, "Members")).toBe("12");
    expect(statValue(container, "Models")).toBe("4");
    expect(statValue(container, "Invites")).toBe("3");
    expect(container.textContent).not.toContain("99");
    expect(hooks.useOrganizationAdminDashboardQuery).toHaveBeenCalledWith(7);
  });

  test("uses zero metric fallbacks while the dashboard is unavailable", async () => {
    hooks.useWorkspaceContext.mockReturnValue({ data: context });
    hooks.useOrganizationAdminDashboardQuery.mockReturnValue({ data: undefined });

    const container = await renderHome();

    expect(statValue(container, "Members")).toBe("0");
    expect(statValue(container, "Models")).toBe("0");
    expect(statValue(container, "Invites")).toBe("0");
  });

  test("hides organization metrics the current role cannot view", async () => {
    hooks.useWorkspaceContext.mockReturnValue({
      data: {
        ...context,
        permissions: {
          canViewMembers: false,
          canViewModels: false,
          canManageInvitations: false,
          canViewPlugins: false,
        },
      },
    });
    hooks.useOrganizationAdminDashboardQuery.mockReturnValue({
      data: {
        stats: {
          totalMembers: 12,
          totalModels: 4,
          pendingInvitations: 3,
        },
      },
    });

    const container = await renderHome();

    expect(statValue(container, "Members")).toBeUndefined();
    expect(statValue(container, "Models")).toBeUndefined();
    expect(statValue(container, "Invites")).toBeUndefined();
  });
});
