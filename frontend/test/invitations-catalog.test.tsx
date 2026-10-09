// @vitest-environment jsdom
import { act } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { InvitationCatalog } from "@/features/workspace/components/InvitationCatalog";
import { changeValue, click, mount, searchDelay } from "./support/dom";
const hooks = vi.hoisted(() => ({ mutate: vi.fn(), bulk: vi.fn() }));
vi.mock("@/features/workspace/api/invitation.mutations", () => ({
  useBulkRevokeInvitationsMutation: () => ({ mutateAsync: hooks.bulk }),
  useResendInvitationMutation: () => ({ mutate: hooks.mutate }),
  useRevokeInvitationMutation: () => ({ mutate: hooks.mutate }),
}));
const rows = Array.from({ length: 49 }, (_, index) => ({
  id: index + 1,
  email: `person${index + 1}@example.com`,
  organizationId: 3,
  organizationName: "QA",
  roleDefinition: { name: "Custom reviewer" },
  status: index === 48 ? "ACCEPTED" : "PENDING",
  expiresAt: "2026-10-01T00:00:00Z",
  token: "test-token",
}));
const settle = async () => {
  for (let i = 0; i < 6; i++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
let fetchMock: ReturnType<typeof vi.fn>;
let fail = false;
beforeEach(() => {
  fail = false;
  hooks.bulk.mockResolvedValue(undefined);
  fetchMock = vi.fn(async (input: string) => {
    if (fail) return new Response('{"message":"Unavailable"}', { status: 500 });
    const url = new URL(input);
    const page = Number(url.searchParams.get("page"));
    const search = url.searchParams.get("search");
    const status = url.searchParams.get("filter");
    const matched = search || status === "ACCEPTED" ? [rows[48]!] : rows;
    return new Response(
      JSON.stringify({
        items: matched.slice(page * 24, (page + 1) * 24),
        page,
        size: 24,
        totalItems: matched.length,
        hasNext: (page + 1) * 24 < matched.length,
        totalInvitations: rows.length,
      }),
      { headers: { "content-type": "application/json" } },
    );
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});
async function render(search = "", manage = false) {
  const view = await mount(<InvitationCatalog organizationId={3} canManage={manage} />, {
    route: `/invitations${search}`,
  });
  await settle();
  // Once shown, the loading state is held for a moment; wait it out instead of guessing.
  for (let turn = 0; turn < 20 && view.host.textContent?.includes("Loading invitations"); turn++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 50)));
  return view.host;
}
test("shows the server total with virtual rows and no pagination footer", async () => {
  const host = await render();
  expect(host.textContent).toContain("49 invitations");
  expect(host.querySelectorAll('input[type="checkbox"]')).toHaveLength(0);
  expect(host.querySelectorAll("[data-index]").length).toBeLessThan(24);
  expect(host.querySelector("footer")).toBeNull();
  expect(host.textContent).not.toContain("Next");
  await click("Load more", host);
  await settle();
  expect(
    fetchMock.mock.calls.some(([url]) => new URL(String(url)).searchParams.get("page") === "1"),
  ).toBe(true);
});
test("passes search and status to the backend and displays its matches", async () => {
  const host = await render("?status=ACCEPTED&q=server-only&page=9");
  expect(host.textContent).toContain("person49@example.com");
  expect(host.textContent).toContain("1 of 49 invitations");
  const request = new URL(String(fetchMock.mock.calls[0]![0]));
  expect(request.searchParams.get("page")).toBe("0");
  expect(request.searchParams.get("filter")).toBe("ACCEPTED");
  expect(request.searchParams.get("search")).toBe("server-only");
});
test("retries an initial failure without showing an empty list", async () => {
  fail = true;
  const host = await render();
  expect(host.textContent).toContain("Could not load invitations.");
  expect(host.textContent).not.toContain("No invitations yet");
  fail = false;
  await click("Retry", host);
  await settle();
  expect(host.textContent).toContain("49 invitations");
});
test("keeps selection while appending pages and clears it when searching", async () => {
  const host = await render("", true);
  await click(host.querySelector('input[type="checkbox"]')!);
  await click("Load more", host);
  await settle();
  expect(host.textContent).toContain("Bulk revoke (1)");
  await click("Bulk revoke (1)", host);
  expect(hooks.bulk).toHaveBeenCalledWith([1]);
  await click(host.querySelector('input[type="checkbox"]')!);
  await changeValue(host.querySelector('input[aria-label="Search invitations"]')!, "server-only");
  await searchDelay();
  await settle();
  expect(host.textContent).not.toContain("Bulk revoke");
  const trigger = host.querySelector('[aria-label="Open actions for person49@example.com"]')!;
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  const resend = [...document.querySelectorAll('[role="menuitem"]')].find(
    (node) => node.textContent === "Resend",
  );
  expect(resend?.getAttribute("aria-disabled")).toBe("true");
});
