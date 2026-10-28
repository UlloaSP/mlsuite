/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { QueryClient } from "@tanstack/react-query";
import { act, createElement } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { workspaceContextQueryOptions } from "@/capabilities/workspace-context/workspace-context";
import { useSelectOrganization } from "@/features/workspace/api/workspace.mutations";
import {
  actInOrganization,
  appFetch,
  ORGANIZATION_HEADER,
  tabOrganization,
} from "@/shared/api/http";
import { mount } from "./support/dom";

const context = (organizationId: number) => ({
  user: { id: 1 },
  currentOrganization: { id: organizationId, name: `Org ${organizationId}` },
  currentMembership: {},
  permissions: {},
  organizationCount: 2,
});
const answer = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const named = (call: unknown[]) =>
  new Headers((call[1] as RequestInit).headers).get(ORGANIZATION_HEADER);

describe("each tab acts in its own organization", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    actInOrganization(null);
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    actInOrganization(null);
    vi.unstubAllGlobals();
  });

  test("a tab opens on the organization last selected and names it on every request after", async () => {
    fetchMock.mockResolvedValueOnce(answer(200, context(4))).mockResolvedValue(answer(200, {}));

    await new QueryClient().fetchQuery(workspaceContextQueryOptions());
    await appFetch("/api/models");

    expect(named(fetchMock.mock.calls[0]!)).toBeNull();
    expect(named(fetchMock.mock.calls[1]!)).toBe("4");
  });

  test("another tab selecting an organization does not move this one", async () => {
    actInOrganization(4);
    fetchMock.mockResolvedValue(answer(200, context(4)));

    // The server's last-selected organization is now 7, but this tab keeps naming its own.
    await new QueryClient().fetchQuery(workspaceContextQueryOptions());

    expect(named(fetchMock.mock.calls[0]!)).toBe("4");
    expect(tabOrganization()).toBe(4);
  });

  test("a tab whose organization the member left returns to the one last selected", async () => {
    actInOrganization(4);
    fetchMock
      .mockResolvedValueOnce(answer(403, { status: 403, message: "Access denied" }))
      .mockResolvedValueOnce(answer(200, context(7)));

    const resolved = await new QueryClient().fetchQuery(workspaceContextQueryOptions());

    expect(resolved.currentOrganization.id).toBe(7);
    expect(named(fetchMock.mock.calls[0]!)).toBe("4");
    expect(named(fetchMock.mock.calls[1]!)).toBeNull();
    expect(tabOrganization()).toBe(7);
  });

  test("any other failure of the context is not taken for a lost membership", async () => {
    actInOrganization(4);
    fetchMock.mockResolvedValue(answer(500, { status: 500, message: "boom" }));

    await expect(new QueryClient().fetchQuery(workspaceContextQueryOptions())).rejects.toThrow(
      "boom",
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(tabOrganization()).toBe(4);
  });

  test("selecting an organization in this tab makes it the one its requests name", async () => {
    actInOrganization(4);
    fetchMock.mockImplementation(async () => answer(200, context(9)));
    let select!: ReturnType<typeof useSelectOrganization>;
    function Switcher() {
      select = useSelectOrganization();
      return null;
    }
    await mount(createElement(Switcher), { queryClient: new QueryClient() });

    await act(async () => {
      await select.mutateAsync(9);
    });
    await appFetch("/api/models");

    expect(tabOrganization()).toBe(9);
    expect(named(fetchMock.mock.calls.at(-1)!)).toBe("9");
  });

  test("a request that names its own organization keeps it", async () => {
    actInOrganization(4);
    fetchMock.mockResolvedValue(answer(200, {}));

    await appFetch("/api/models", { headers: { [ORGANIZATION_HEADER]: "9" } });

    expect(named(fetchMock.mock.calls[0]!)).toBe("9");
  });
});
