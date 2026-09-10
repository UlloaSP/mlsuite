// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { RolesPage } from "@/features/workspace/pages/roles-page";
const hooks = vi.hoisted(() => ({
  dashboard: vi.fn(),
  roles: vi.fn(),
  retry: vi.fn(),
  mutate: vi.fn(),
}));
vi.mock("@/features/workspace/api/workspace.queries", () => ({
  useOrganizationAdminDashboardQuery: hooks.dashboard,
  useOrganizationRolesQuery: hooks.roles,
}));
vi.mock("@/features/workspace/api/role.mutations", () => ({
  useRoleMutations: () =>
    Object.fromEntries(
      ["create", "update", "delete", "duplicate", "createFromTemplate"].map((key) => [
        key,
        { mutate: hooks.mutate },
      ]),
    ),
}));
const data = {
  roles: Array.from({ length: 21 }, (_, i) => ({
    id: i + 1,
    name: `Role ${i + 1}`,
    description: "",
    permissions: [],
    userCount: 0,
    locked: false,
    actions: { canView: true },
  })),
  templates: Array.from({ length: 21 }, (_, i) => ({
    id: i + 1,
    name: `Template ${i + 1}`,
    description: "",
    category: "CATEGORY_PILL",
    permissionKeys: ["VIEW_MODELS"],
  })),
  permissionCatalog: [
    {
      name: "Organization",
      permissions: Array.from({ length: 21 }, (_, i) => ({
        key: `KEY_${i + 1}`,
        label: `Permission ${i + 1}`,
        description: "",
        dangerous: false,
      })),
    },
  ],
};
let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  hooks.dashboard.mockReturnValue({
    data: { permissions: { canViewMembers: true, canManageMemberRoles: true } },
  });
  hooks.roles.mockReturnValue({ data, refetch: hooks.retry });
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.clearAllMocks();
});
async function render(search = "") {
  await act(async () =>
    root.render(
      <MemoryRouter initialEntries={[`/organizations/3/roles${search}`]}>
        <Routes>
          <Route path="/organizations/:organizationId/roles" element={<RolesPage />} />
        </Routes>
      </MemoryRouter>,
    ),
  );
}
function hasLabel(label: string) {
  return [...host.querySelectorAll("p")].some(
    (node) => node.textContent === label || node.firstChild?.textContent?.trim() === label,
  );
}
async function click(label: string) {
  const button = [...host.querySelectorAll("button")].find(
    (node) => node.textContent?.trim() === label,
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
test.each([
  ["roles", "Role"],
  ["templates", "Template"],
])("paginates %s and keeps total tab counts", async (tab, label) => {
  await render(`?tab=${tab}`);
  expect([...host.querySelectorAll('[role="tab"]')].map((node) => node.textContent)).toEqual([
    "Roles (21)",
    "Templates (21)",
    "All Permissions (21)",
  ]);
  expect(hasLabel(`${label} 10`)).toBe(true);
  expect(hasLabel(`${label} 11`)).toBe(false);
  await click("Next");
  expect(hasLabel(`${label} 11`)).toBe(true);
  await click("Next");
  expect(hasLabel(`${label} 21`)).toBe(true);
  await click("Previous");
  expect(hasLabel(`${label} 11`)).toBe(true);
  expect(host.textContent).not.toContain("CATEGORY_PILL");
  expect(host.textContent).not.toContain("Backend permission catalog");
  expect(host.textContent).not.toContain("All Roles");
});
test.each(["roles", "templates"])(
  "searches %s without changing total and clamps page",
  async (tab) => {
    await render(`?tab=${tab}&q=21&page=3`);
    expect(host.querySelector('button[aria-current="page"]')?.textContent).toBe("1");
    expect(host.textContent).toContain("Roles (21)");
    expect(host.textContent).not.toContain(" 20");
  },
);
test("clears page and search when switching tabs", async () => {
  await render("?tab=roles&page=3&q=21");
  await click("Templates (21)");
  expect(host.textContent).toContain("Template 1");
  expect(hasLabel("Template 21")).toBe(false);
  expect(host.querySelector("input")?.value).toBe("");
});
test.each(["roles", "templates", "permissions"])(
  "reports load errors for %s with retry",
  async (tab) => {
    hooks.roles.mockReturnValue({ isError: true, refetch: hooks.retry });
    await render(`?tab=${tab}`);
    expect(host.textContent).toContain(`Could not load ${tab}.`);
    await click("Retry");
    expect(hooks.retry).toHaveBeenCalledOnce();
  },
);
test("loading is not an empty catalog", async () => {
  hooks.roles.mockReturnValue({ isPending: true });
  await render("?page=2");
  expect(host.textContent).toContain("Loading roles...");
  expect(host.textContent).not.toContain("No roles yet");
});
test("shows an empty search result", async () => {
  await render("?q=missing");
  expect(host.textContent).toContain("No matching roles");
});
test("read-only users cannot create roles or select a template", async () => {
  hooks.dashboard.mockReturnValue({ data: { permissions: { canViewMembers: true } } });
  await render("?tab=templates");
  expect(host.textContent).not.toContain("Create Role");
  const template = [...host.querySelectorAll("button")].find((node) =>
    node.textContent?.startsWith("Template 1"),
  );
  expect(template?.disabled).toBe(true);
});

test("keeps all permissions grouped without pagination", async () => {
  await render("?tab=permissions");
  expect(host.querySelector('section[aria-label="Permission groups"] h2')?.textContent).toBe(
    "Organization",
  );
  expect(host.querySelectorAll('section[aria-label="Permission groups"] li')).toHaveLength(21);
  expect(host.querySelector("footer")).toBeNull();
  expect(host.textContent).toContain("All Permissions (21)");
});
test("permission search preserves the group and total", async () => {
  await render("?tab=permissions&q=21");
  expect(host.querySelectorAll('section[aria-label="Permission groups"] li')).toHaveLength(1);
  expect(host.querySelector('section[aria-label="Permission groups"] h2')?.textContent).toBe(
    "Organization",
  );
  expect(host.textContent).toContain("All Permissions (21)");
  expect(host.querySelector("footer")).toBeNull();
});
test("role fields have visible associated labels in vertical document order", async () => {
  await render();
  await click("Create Role");
  expect(host.querySelector('label[for="role-name"]')?.textContent).toBe("Name");
  expect(host.querySelector('label[for="role-description"]')?.textContent).toBe("Description");
  const name = host.querySelector("#role-name")!;
  const description = host.querySelector("#role-description")!;
  expect(name.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
