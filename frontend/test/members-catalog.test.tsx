// @vitest-environment jsdom
import { act } from "react";
import { Routes, Route } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { MembersPage } from "@/features/workspace/pages/members-page";
import { click, mount, changeValue, searchDelay } from "./support/dom";
vi.mock("@/features/workspace/api/workspace.queries", () => ({
  useOrganizationAdminDashboardQuery: () => ({ data: { permissions: { canViewMembers: true } } }),
}));
const mutations = vi.hoisted(() => ({ role: vi.fn(), remove: vi.fn() }));
vi.mock("@/features/workspace/api/member.mutations", () => ({
  useRemoveOrganizationMemberMutation: () => ({ mutate: mutations.remove }),
  useUpdateOrganizationMemberRoleMutation: () => ({ mutate: mutations.role }),
}));
const rows = Array.from({ length: 49 }, (_, index) => ({
  id: index + 1,
  fullName: `Person ${index + 1}`,
  email: `person${index + 1}@example.com`,
  status: "ACTIVE",
  role: {
    id: index === 48 ? 9 : 3,
    name: index === 48 ? "Custom reviewer" : "Owner",
    systemKey: index === 48 ? null : "OWNER",
  },
  // Only the second member's role may be changed.
  actions: { canChangeRole: index === 1, canRemove: false, assignableRoles: [] },
}));
let fail = false;
let requests: URL[];
const settle = async () => {
  for (let i = 0; i < 6; i++)
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
};
beforeEach(() => {
  fail = false;
  requests = [];
  vi.stubGlobal("fetch", async (input: string) => {
    const url = new URL(input);
    requests.push(url);
    if (fail) return new Response('{"message":"Unavailable"}', { status: 500 });
    if (url.pathname.includes("/roles/"))
      return new Response(
        JSON.stringify({
          items:
            url.searchParams.get("filter") === "9" || url.searchParams.get("search")
              ? [rows[48]!.role]
              : [rows[0]!.role, rows[48]!.role],
          page: 0,
          size: 24,
          totalItems: 2,
          hasNext: false,
        }),
        { headers: { "content-type": "application/json" } },
      );
    const page = Number(url.searchParams.get("page"));
    const matched =
      url.searchParams.get("search") === "missing"
        ? []
        : url.searchParams.get("search") || url.searchParams.get("filter") === "9"
          ? [rows[48]!]
          : rows;
    return new Response(
      JSON.stringify({
        items: matched.slice(page * 24, (page + 1) * 24),
        page,
        size: 24,
        totalItems: matched.length,
        hasNext: (page + 1) * 24 < matched.length,
        totalMembers: 49,
      }),
      { headers: { "content-type": "application/json" } },
    );
  });
});
afterEach(() => vi.unstubAllGlobals());
async function render(search = "") {
  const view = await mount(
    <Routes>
      <Route path="/organizations/:organizationId/members" element={<MembersPage />} />
    </Routes>,
    { route: `/organizations/3/members${search}` },
  );
  await settle();
  return view.host;
}
test("uses the whole server count and virtualizes loaded members", async () => {
  const host = await render();
  expect(host.textContent).toContain("49 members");
  expect(host.querySelectorAll("[data-index]").length).toBeLessThan(24);
  expect(host.textContent).not.toContain("Remove");
  expect(host.querySelector("footer")).toBeNull();
  await click("Load more", host);
  await settle();
  expect(requests.some((url) => url.searchParams.get("page") === "1")).toBe(true);
});
test("filters by a custom role through the backend, starting at page zero", async () => {
  const host = await render("?role=9&page=3");
  expect(host.textContent).toContain("1 of 49 members");
  expect(host.textContent).toContain("Person 49");
  expect(
    requests.find((url) => url.pathname.endsWith("/members/catalog"))!.searchParams.get("filter"),
  ).toBe("9");
  expect(
    requests.find((url) => url.pathname.endsWith("/members/catalog"))!.searchParams.get("page"),
  ).toBe("0");
});
test("keeps backend search results even when their display text differs", async () => {
  const host = await render("?q=server-only");
  expect(host.textContent).toContain("Person 49");
  expect(
    requests.find((url) => url.pathname.includes("/members/"))!.searchParams.get("search"),
  ).toBe("server-only");
});
test("distinguishes a failed request from empty results and retries", async () => {
  fail = true;
  const host = await render();
  expect(host.textContent).toContain("Could not load members.");
  expect(host.textContent).not.toContain("No members yet");
  fail = false;
  await click("Retry", host);
  await settle();
  expect(host.textContent).toContain("49 members");
});
test("shows no matches for an empty backend search", async () => {
  const host = await render("?q=missing");
  expect(host.textContent).toContain("No matching members");
});
test("changes a member's role from a list that opens above the rows", async () => {
  const host = await render();
  const role = host.querySelector<HTMLInputElement>('input[aria-label="Role for Person 2"]')!;
  await act(async () => role.focus());
  await settle();

  const listbox = document.querySelector('[role="listbox"]')!;
  // In the top layer: the virtual rows below can neither clip nor cover it.
  expect(host.contains(listbox)).toBe(false);
  const option = (name: string) =>
    [...listbox.querySelectorAll('[role="option"]')].find((node) =>
      node.textContent?.includes(name),
    )!;
  const choose = (name: string) =>
    act(async () => option(name).dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));

  await choose("Custom reviewer");
  expect(mutations.role).toHaveBeenCalledWith({ membershipId: 2, roleDefinitionId: 9 });

  mutations.role.mockClear();
  await act(async () => role.blur());
  await act(async () => role.focus());
  await settle();
  // Picking the role the member already has is not a change.
  await act(async () =>
    [...document.querySelectorAll('[role="option"]')]
      .find((node) => node.textContent?.includes("Owner"))!
      .dispatchEvent(new MouseEvent("mousedown", { bubbles: true })),
  );
  expect(mutations.role).not.toHaveBeenCalled();
});

test("role filter choices search on the server and preserve server-only matches", async () => {
  const host = await render();
  const input = host.querySelector<HTMLInputElement>('[aria-label="Filter by role"]')!;
  await act(async () => input.focus());
  await changeValue(input, "server-only");
  await searchDelay();
  await settle();
  const request = [...requests]
    .reverse()
    .find((url) => url.pathname.endsWith("/members/roles/catalog"))!;
  expect(request.searchParams.get("search")).toBe("server-only");
  const option = document.querySelector<HTMLElement>('[role="option"]')!;
  expect(option.textContent).toContain("Custom reviewer");
  await act(async () => option.dispatchEvent(new MouseEvent("mousedown", { bubbles: true })));
  await settle();
  expect(
    [...requests]
      .reverse()
      .find((url) => url.pathname.endsWith("/members/catalog"))!
      .searchParams.get("filter"),
  ).toBe("9");
});
