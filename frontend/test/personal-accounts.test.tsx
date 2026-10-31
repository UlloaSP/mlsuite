// @vitest-environment jsdom
import { act } from "react";
import { DropdownMenu } from "radix-ui";
import { Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { OrganizationMenuContent } from "@/app/components/OrganizationMenuContent";
import { getWorkspaceLinks } from "@/app/components/workspace-navigation";
import { CreateOrganizationRoute } from "@/app/router/create-organization-route";
import { RequireTeamOrganization } from "@/features/workspace/components/RequireTeamOrganization";
import { OrganizationOverview } from "@/features/workspace/components/overview/OrganizationOverview";
import { YourOrganizationsPage } from "@/features/workspace/pages/your-organizations-page";
import { ProfilePage } from "@/features/user/pages/profilePage";
import type {
  OrganizationDto,
  WorkspaceCurrentContextDto,
  WorkspacePermissionsDto,
} from "@/shared/api/openapi.gen";
import { mount } from "./support/dom";

const namespace = (id: number, name: string, kind: OrganizationDto["kind"]) =>
  ({
    id,
    name,
    kind,
    slug: name.toLowerCase().replaceAll(" ", "-"),
    description: null,
    logoUrl: null,
  }) as OrganizationDto;

const PERSONAL = namespace(3, "Ada Lovelace", "PERSONAL");
const TEAM = namespace(7, "Acme", "TEAM");
const ALL_PERMISSIONS = {
  canViewWorkspace: true,
  canViewMembers: true,
  canViewInvitations: true,
  canInviteMembers: true,
  canManageMemberRoles: true,
  canViewAuditLog: true,
  canViewOrganization: true,
  canViewPlugins: true,
} as WorkspacePermissionsDto;

const state = vi.hoisted(() => ({
  user: undefined as { data?: unknown } | undefined,
  context: undefined as { data?: unknown } | undefined,
  catalog: [] as unknown[],
  filters: [] as string[],
  dashboard: {} as { data?: unknown; isPending?: boolean },
  superadmin: false,
  ownerQueries: [] as boolean[],
  create: vi.fn(),
  select: vi.fn(() => Promise.resolve()),
  toast: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: state.toast } }));
vi.mock("@/capabilities/workspace-context/session", () => ({
  useUser: () => state.user,
  useCurrentUserIsSuperadmin: () => state.superadmin,
}));
vi.mock("@/capabilities/workspace-context/workspace-context", () => ({
  useWorkspaceContext: () => state.context,
  useWorkspaceOrganizationCatalog: (_search: string, filter = "all") => {
    state.filters.push(filter);
    return {
      data: { items: state.catalog, totalItems: state.catalog.length },
      isLoading: false,
      isFetching: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
    };
  },
}));
vi.mock("@/features/workspace/api/workspace.queries", () => ({
  useOrganizationAdminDashboardQuery: () => state.dashboard,
}));
vi.mock("@/features/workspace/api/workspace.mutations", () => ({
  useCreateOrganizationMutation: () => ({ mutateAsync: state.create, isPending: false }),
  useSelectOrganization: () => ({ mutateAsync: state.select, isPending: false }),
}));
vi.mock("@/features/admin/api/admin-user.queries", () => ({
  useOwnerCandidateCatalog: (_search: string, enabled: boolean) => {
    state.ownerQueries.push(enabled);
    return { data: { items: [] } };
  },
}));
vi.mock("@/features/user/components/ProfileBody", () => ({ ProfileBody: () => null }));
vi.mock("@/features/user/components/ProfileHeader", () => ({ ProfileHeader: () => null }));

beforeEach(() => {
  Object.assign(state, {
    user: { data: { id: 3, fullName: "Ada Lovelace", email: "ada@example.test" } },
    context: { data: { currentOrganization: PERSONAL } },
    catalog: [],
    filters: [],
    dashboard: {},
    superadmin: false,
    ownerQueries: [],
  });
  state.create.mockReset();
  state.select.mockClear();
  state.toast.mockClear();
});

describe("the switcher", () => {
  const context = {
    currentOrganization: PERSONAL,
    permissions: ALL_PERMISSIONS,
    user: { avatarUrl: null },
  } as unknown as WorkspaceCurrentContextDto;

  const menuEntries = async () => {
    state.catalog = [PERSONAL, TEAM];
    await mount(
      <DropdownMenu.Root open>
        <DropdownMenu.Trigger>Account</DropdownMenu.Trigger>
        <OrganizationMenuContent align="start" side="bottom" className="menu" context={context} />
      </DropdownMenu.Root>,
      { route: "/models" },
    );
    return [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  };

  test("pictures the personal account by initials and leads with it, then ends in a new organization", async () => {
    const entries = (await menuEntries()).map((node) => node.textContent);

    // The two workspace pages a personal account keeps, then accounts, then the way to more.
    expect(entries).toEqual([
      "Overview",
      "Audit log",
      "ADAda Lovelaceada-lovelace",
      "Acmeacme",
      "Organizations",
      "New organization",
    ]);
    expect(document.body.textContent).not.toContain("Switch organization");
  });

  test("offers only what stays true of one person", () => {
    expect(getWorkspaceLinks(ALL_PERMISSIONS, PERSONAL).map(({ label }) => label)).toEqual([
      "Overview",
      "Audit log",
    ]);
    expect(getWorkspaceLinks(ALL_PERMISSIONS, TEAM).map(({ label }) => label)).toEqual([
      "Overview",
      "Members",
      "Invitations",
      "Roles & templates",
      "Audit log",
      "Settings",
    ]);
  });
});

describe("pages that belong to organizations", () => {
  const openGuarded = () =>
    mount(
      <Routes>
        <Route
          path="/workspace/organizations/:organizationId/members"
          element={
            <RequireTeamOrganization>
              <p>Member list</p>
            </RequireTeamOrganization>
          }
        />
      </Routes>,
      { route: "/workspace/organizations/3/members" },
    );

  test("a personal account opened by address explains itself", async () => {
    state.dashboard = { data: { organization: PERSONAL } };
    const { host } = await openGuarded();

    expect(host.textContent).not.toContain("Member list");
    expect(host.textContent).toContain("Personal accounts don't have this page");
    expect(host.querySelector('a[href="/workspace/organizations/create"]')).not.toBeNull();
  });

  test("an organization opens, and so does a failure the page itself reports", async () => {
    state.dashboard = { data: { organization: TEAM } };
    expect((await openGuarded()).host.textContent).toContain("Member list");

    state.dashboard = { isPending: false };
    expect((await openGuarded()).host.textContent).toContain("Member list");
  });

  test("the overview of a personal account leaves out people and organization settings", async () => {
    const { host } = await mount(
      <OrganizationOverview
        isCurrent
        organization={PERSONAL}
        permissions={ALL_PERMISSIONS}
        role="OWNER"
        dashboard={{ isError: false, refetch: vi.fn() }}
      />,
      { route: "/workspace" },
    );

    expect(host.textContent).toContain("Everything you run");
    expect(host.textContent).not.toContain("Settings");
    expect(host.textContent).not.toContain("Members");
    expect(host.textContent).not.toContain("Invitations");
    expect(host.textContent).not.toContain("organization");
  });

  test("the profile tells a personal account from an organization", async () => {
    state.context = {
      data: {
        currentOrganization: PERSONAL,
        currentMembership: { roleDefinition: { name: "Owner" } },
        membershipCount: 0,
      },
    };
    const personal = await mount(<ProfilePage />, { route: "/profile" });

    expect(personal.host.textContent).toContain("Working in your personal account");
    expect(personal.host.textContent).toContain("Not a member of any organization");
    expect(personal.host.textContent).not.toContain("Owner");

    state.context = {
      data: {
        currentOrganization: TEAM,
        currentMembership: { roleDefinition: { name: "Viewer" } },
        membershipCount: 2,
      },
    };
    const team = await mount(<ProfilePage />, { route: "/profile" });

    expect(team.host.textContent).toContain("Member of 2 organizations");
    expect(team.host.textContent).toContain("Viewer");
  });
});

describe("organizations for everyone", () => {
  test("the list holds the member's organizations and offers switching to the others", async () => {
    state.catalog = [TEAM, namespace(9, "Globex", "TEAM")];
    state.context = { data: { currentOrganization: TEAM } };
    const { host } = await mount(<YourOrganizationsPage />, { route: "/workspace/organizations" });

    expect(state.filters).toContain("team");
    const switches = [...host.querySelectorAll("button")].filter(
      (button) => button.textContent === "Switch",
    );
    expect(switches).toHaveLength(1);
    await act(async () => switches[0]!.click());
    expect(state.select).toHaveBeenCalledWith(9);
  });

  test("with none it invites creating one", async () => {
    const { host } = await mount(<YourOrganizationsPage />, { route: "/workspace/organizations" });

    expect(host.textContent).toContain("No organizations yet");
    expect(host.querySelector('a[href="/workspace/organizations/create"]')).not.toBeNull();
  });

  const fillAndCreate = async () => {
    state.create.mockResolvedValue({ id: 11 });
    const { host } = await mount(<CreateOrganizationRoute />, {
      route: "/workspace/organizations/create",
    });
    const name = host.querySelector<HTMLInputElement>('input[placeholder="Northwind AI"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(name, "Acme");
      name.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const create = [...host.querySelectorAll("button")].find(
      (button) => button.textContent === "Create organization",
    )!;
    await act(async () => create.click());
    return host;
  };

  test("a user creates one without choosing an owner, stays put, and is offered to switch", async () => {
    await fillAndCreate();

    expect(state.ownerQueries).toEqual([false]);
    expect(state.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Acme", slug: "acme", ownerUserId: undefined }),
    );
    expect(state.select).not.toHaveBeenCalled();
    const [, options] = state.toast.mock.calls[0] as unknown as [
      string,
      { action: { label: string; onClick: () => void } },
    ];
    expect(options.action.label).toBe("Switch to it");
    await act(async () => options.action.onClick());
    expect(state.select).toHaveBeenCalledWith(11);
  });

  test("a superadmin keeps choosing the owner", async () => {
    state.superadmin = true;
    const host = await fillAndCreate();

    expect(state.ownerQueries).toContain(true);
    expect(host.textContent).toContain("Owner");
    expect(state.create).toHaveBeenCalledWith(expect.objectContaining({ ownerUserId: 3 }));
  });
});
