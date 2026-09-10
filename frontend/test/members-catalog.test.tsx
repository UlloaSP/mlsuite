// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Routes, Route } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { MembersPage } from "@/features/workspace/pages/members-page";
const hooks = vi.hoisted(() => ({
  dashboard: vi.fn(),
  members: vi.fn(),
  retry: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock("@/features/workspace/api/workspace.queries", () => ({
  useOrganizationAdminDashboardQuery: hooks.dashboard,
  useOrganizationMembersQuery: hooks.members,
}));
vi.mock("@/features/workspace/api/member.mutations", () => ({
  useRemoveOrganizationMemberMutation: () => ({ mutate: hooks.mutate }),
  useUpdateOrganizationMemberRoleMutation: () => ({ mutate: hooks.mutate }),
}));
let host: HTMLDivElement;
let root: Root;
const rows = Array.from({ length: 21 }, (_, i) => ({
  id: i + 1,
  fullName: `Person ${i + 1}`,
  email: `person${i + 1}@example.com`,
  status: "ACTIVE",
  role: {
    id: i === 20 ? 9 : 3,
    name: i === 20 ? "Custom reviewer" : "Owner",
    systemKey: i === 20 ? null : "OWNER",
  },
  actions: { canChangeRole: false, canRemove: false, assignableRoles: [] },
}));
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  hooks.dashboard.mockReturnValue({ data: { permissions: { canViewMembers: true } } });
  hooks.members.mockReturnValue({ data: rows, isSuccess: true, refetch: hooks.retry });
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});
async function render(search = "") {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[`/organizations/3/members${search}`]}>
        <Routes>
          <Route path="/organizations/:organizationId/members" element={<MembersPage />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}
async function click(label: string) {
  const button = [...host.querySelectorAll("button")].find(
    (node) => node.textContent?.trim() === label,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
test("shows one total, ten member cards and advances pages without role KPI duplicates", async () => {
  await render();
  expect(host.textContent).toContain("21 members");
  expect(host.textContent).not.toContain("Active Members");
  expect(host.textContent).not.toContain("Person 11");
  expect(host.textContent?.match(/Owner/g)).toHaveLength(10);
  expect(host.textContent).not.toContain("Remove");
  await click("Next");
  expect(host.textContent).toContain("Person 11");
  await click("Next");
  expect(host.textContent).toContain("Person 21");
  expect(host.textContent).toContain("Custom reviewer");
  await click("Previous");
  expect(host.textContent).toContain("Person 11");
});
test("filters by actual custom role ID and clamps an out-of-range page", async () => {
  await render("?role=9&page=3");
  expect(host.textContent).toContain("1 of 21 members");
  expect(host.textContent).toContain("Person 21");
  expect(host.textContent).not.toContain("person1@example.com");
});
test("searches email and shows an empty state for no matches", async () => {
  await render("?q=person21@example.com");
  expect(host.textContent).toContain("1 of 21 members");
  expect(host.textContent).toContain("Person 21");
});
test("does not mistake a failed request for an empty membership", async () => {
  hooks.members.mockReturnValue({ isError: true, refetch: hooks.retry });
  await render();
  expect(host.textContent).toContain("Could not load members.");
  expect(host.textContent).not.toContain("No members yet");
  await click("Retry");
  expect(hooks.retry).toHaveBeenCalledOnce();
});
test("shows loading while awaiting data instead of a zero total", async () => {
  hooks.members.mockReturnValue({ isPending: true });
  await render("?page=2");
  expect(host.textContent).toContain("Loading members...");
  expect(host.textContent).not.toContain("0 members");
});
test("shows no matches for unmatched search", async () => {
  await render("?q=missing");
  expect(host.textContent).toContain("No matching members");
});
