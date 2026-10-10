// @vitest-environment jsdom
import { act } from "react";
import { Route, Routes } from "react-router";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { RolesPage } from "@/features/workspace/pages/roles-page";
import { click as clickIn, mount } from "./support/dom";
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

vi.mock("@/features/workspace/api/workspace-catalog-queries", () => {
  const catalog = (resource: "roles" | "templates" | "permissionCatalog", search: string) => {
    const response = hooks.roles();
    const source = response.data?.[resource] ?? [];
    const items =
      resource === "permissionCatalog"
        ? source
            .map((group: { name: string; permissions: Array<{ label: string }> }) => ({
              ...group,
              permissions: group.permissions.filter((item) =>
                item.label.toLowerCase().includes(search.toLowerCase()),
              ),
            }))
            .filter((group: { permissions: unknown[] }) => group.permissions.length)
        : source.filter((item: { name: string }) =>
            item.name.toLowerCase().includes(search.toLowerCase()),
          );
    return {
      ...response,
      data: response.data ? { items, totalItems: items.length } : undefined,
      error: response.isError ? new Error("Unavailable") : null,
      isLoading: response.isPending,
      hasNextPage: false,
    };
  };
  return {
    useRoleCatalogMetadata: () => {
      const response = hooks.roles();
      return {
        ...response,
        data: response.data
          ? {
              roles: response.data.roles.length,
              templates: response.data.templates.length,
              permissionCatalog: response.data.permissionCatalog,
            }
          : undefined,
      };
    },
    useRoleCatalog: (_id: number, search: string) => catalog("roles", search),
    useRoleTemplateCatalog: (_id: number, search: string) => catalog("templates", search),
    usePermissionCatalog: (_id: number, search: string) => catalog("permissionCatalog", search),
  };
});

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
beforeEach(() => {
  hooks.dashboard.mockReturnValue({
    data: { permissions: { canViewMembers: true, canManageMemberRoles: true } },
  });
  hooks.roles.mockReturnValue({ data, refetch: hooks.retry });
});
afterEach(() => {
  vi.clearAllMocks();
});
async function render(search = "") {
  ({ host } = await mount(
    <Routes>
      <Route path="/organizations/:organizationId/roles" element={<RolesPage />} />
    </Routes>,
    { route: `/organizations/3/roles${search}` },
  ));
}
function hasLabel(label: string) {
  return [...host.querySelectorAll("p, h2")].some(
    (node) => node.textContent === label || node.firstChild?.textContent?.trim() === label,
  );
}
// Each tab reads "label|count": the count is its own badge, not part of the label.
function tabLabels() {
  return [...host.querySelectorAll('[role="tab"]')].map((node) =>
    [...node.childNodes].map((child) => child.textContent).join("|"),
  );
}
async function clickTab(label: string) {
  const tab = [...host.querySelectorAll<HTMLButtonElement>('[role="tab"]')].find(
    (node) => node.firstChild?.textContent === label,
  );
  expect(tab).toBeDefined();
  await act(async () => {
    tab!.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  });
}
const click = (label: string) => clickIn(label, host);
test.each([
  ["roles", "Role"],
  ["templates", "Template"],
])("virtualizes %s and keeps complete tab counts", async (tab, label) => {
  await render(`?tab=${tab}`);
  expect(tabLabels()).toEqual(["Roles|21", "Templates|21", "All permissions|21"]);
  expect(hasLabel(`${label} 1`)).toBe(true);
  expect(host.querySelector("footer")).toBeNull();
  expect(host.textContent).not.toContain("Next");
  expect(host.textContent).not.toContain("CATEGORY_PILL");
  expect(host.textContent).not.toContain("Backend permission catalog");
  expect(host.textContent).not.toContain("All Roles");
});
test.each(["roles", "templates"])(
  "searches %s without changing the complete tab count",
  async (tab) => {
    await render(`?tab=${tab}&q=21&page=3`);
    expect(host.querySelector("footer")).toBeNull();
    expect(tabLabels()).toContain("Roles|21");
    expect(host.textContent).not.toContain(" 20");
  },
);
test("clears page and search when switching tabs", async () => {
  await render("?tab=roles&page=3&q=21");
  await clickTab("Templates");
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
  expect(host.textContent).toContain("Loading roles…");
  expect(host.textContent).not.toContain("No roles yet");
});
test("shows an empty search result", async () => {
  await render("?q=missing");
  expect(host.textContent).toContain("No matching roles");
});
test("read-only users cannot create roles or select a template", async () => {
  hooks.dashboard.mockReturnValue({ data: { permissions: { canViewMembers: true } } });
  await render("?tab=templates");
  expect(host.textContent).not.toContain("Create role");
  expect(hasLabel("Template 1")).toBe(true);
  const template = [...host.querySelectorAll("button")].find((node) =>
    node.textContent?.startsWith("Template 1"),
  );
  expect(template).toBeUndefined();
});

test("keeps all permissions grouped without pagination", async () => {
  await render("?tab=permissions");
  expect(host.querySelector("h2")?.textContent).toBe("Organization");
  expect(host.querySelectorAll("[data-index] li")).toHaveLength(21);
  expect(host.querySelector("footer")).toBeNull();
  expect(tabLabels()).toContain("All permissions|21");
});
test("permission search preserves the group and total", async () => {
  await render("?tab=permissions&q=21");
  expect(host.querySelectorAll("[data-index] li")).toHaveLength(1);
  expect(host.querySelector("h2")?.textContent).toBe("Organization");
  expect(tabLabels()).toContain("All permissions|21");
  expect(host.querySelector("footer")).toBeNull();
});
test("role fields have visible associated labels in vertical document order", async () => {
  await render();
  await click("Create role");
  // The form is a dialog, rendered in a portal on document.body.
  expect(document.querySelector('label[for="role-name"]')?.textContent).toBe("Name");
  expect(document.querySelector('label[for="role-description"]')?.textContent).toBe("Description");
  const name = document.querySelector("#role-name")!;
  const description = document.querySelector("#role-description")!;
  expect(name.compareDocumentPosition(description) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
});
