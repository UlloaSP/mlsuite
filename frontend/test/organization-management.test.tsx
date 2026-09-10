/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, describe, expect, test, vi } from "vite-plus/test";
import type { WorkspacePermissionsDto } from "@/capabilities/workspace-context/workspace-context.types";
import { InvitationsPage } from "@/features/workspace/pages/invitations-page";
import { OrganizationSettingsPage } from "@/features/workspace/pages/organization-settings-page";
import { RolesPage } from "@/features/workspace/pages/roles-page";

const hooks = vi.hoisted(() => ({
  dashboard: vi.fn(),
  invitations: vi.fn(),
  invitationCandidates: vi.fn(),
  members: vi.fn(),
  remove: vi.fn(),
  roles: vi.fn(),
  transfer: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/features/workspace/api/workspace.queries", () => ({
  useOrganizationAdminDashboardQuery: hooks.dashboard,
  useOrganizationInvitationCandidatesQuery: hooks.invitationCandidates,
  useOrganizationInvitationsQuery: hooks.invitations,
  useOrganizationMembersQuery: hooks.members,
  useOrganizationRolesQuery: hooks.roles,
}));

vi.mock("@/features/workspace/api/invitation.mutations", () => {
  const createMutation = () => ({
    error: null,
    isError: false,
    isPending: false,
    isSuccess: false,
    mutate: vi.fn(),
    mutateAsync: vi.fn(),
  });
  return {
    useBulkRevokeInvitationsMutation: createMutation,
    useCreateInvitationMutation: createMutation,
    useResendInvitationMutation: createMutation,
    useRevokeInvitationMutation: createMutation,
  };
});

vi.mock("@/features/workspace/api/role.mutations", () => {
  const createMutation = () => ({ mutate: vi.fn() });
  return {
    useRoleMutations: () => ({
      create: createMutation(),
      createFromTemplate: createMutation(),
      delete: createMutation(),
      duplicate: createMutation(),
      update: createMutation(),
    }),
  };
});

vi.mock("@/features/workspace/api/workspace.mutations", () => ({
  useDeleteOrganizationMutation: hooks.remove,
  useTransferOrganizationOwnershipMutation: hooks.transfer,
  useUpdateOrganizationMutation: hooks.update,
}));

const permissions = (patch: Partial<WorkspacePermissionsDto> = {}): WorkspacePermissionsDto => ({
  canViewWorkspace: true,
  canViewOrganization: true,
  canEditOrganization: false,
  canDeleteOrganization: false,
  canTransferOwnership: false,
  canViewMembers: false,
  canInviteMembers: false,
  canManageMemberRoles: false,
  canRemoveMembers: false,
  canViewInvitations: false,
  canManageInvitations: false,
  canViewModels: false,
  canCreateModels: false,
  canEditModels: false,
  canDeleteModels: false,
  canRunPredictions: false,
  canExportPredictions: false,
  canReview: false,
  canManageReviews: false,
  canViewPlugins: false,
  canManagePlugins: false,
  ...patch,
});

const organization = {
  id: 7,
  name: "Acme",
  slug: "acme",
  description: null,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

const mutation = (patch = {}) => ({
  error: null,
  isError: false,
  isPending: false,
  isSuccess: false,
  mutate: vi.fn(),
  mutateAsync: vi.fn(),
  ...patch,
});

describe("organization management", () => {
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    vi.clearAllMocks();
  });

  async function renderSettings() {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/workspace/organizations/7/settings"]}>
          <Routes>
            <Route
              path="/workspace/organizations/:organizationId/settings"
              element={<OrganizationSettingsPage />}
            />
          </Routes>
        </MemoryRouter>,
      );
    });
    return container;
  }

  async function renderInvitations() {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/workspace/organizations/7/invitations"]}>
          <Routes>
            <Route
              path="/workspace/organizations/:organizationId/invitations"
              element={<InvitationsPage />}
            />
          </Routes>
        </MemoryRouter>,
      );
    });
    return container;
  }

  async function renderRoles() {
    const container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root?.render(
        <MemoryRouter initialEntries={["/workspace/organizations/7/roles"]}>
          <Routes>
            <Route path="/workspace/organizations/:organizationId/roles" element={<RolesPage />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    return container;
  }

  function mockSettings(permissionPatch: Partial<WorkspacePermissionsDto> = {}) {
    hooks.dashboard.mockReturnValue({
      data: { organization, permissions: permissions(permissionPatch) },
      isError: false,
      isLoading: false,
    });
    hooks.members.mockReturnValue({ data: [], error: null, isError: false, isLoading: false });
    hooks.update.mockReturnValue(mutation());
    hooks.transfer.mockReturnValue(mutation());
    hooks.remove.mockReturnValue(mutation());
  }

  test("saves name, slug, and an empty description", async () => {
    const save = vi.fn();
    mockSettings({ canEditOrganization: true });
    hooks.update.mockReturnValue(mutation({ isSuccess: true, mutate: save }));

    const container = await renderSettings();
    const description = container.querySelector<HTMLTextAreaElement>("#organization-description");
    const submit = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Save changes",
    );

    expect(description?.value).toBe("");
    await act(async () => submit?.click());
    expect(save).toHaveBeenCalledWith(
      { name: "Acme", slug: "acme", description: "" },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    expect(container.textContent).toContain("Organization saved.");
  });

  test("shows organization and mutation failures", async () => {
    mockSettings({
      canEditOrganization: true,
      canDeleteOrganization: true,
      canTransferOwnership: true,
    });
    hooks.update.mockReturnValue(mutation({ error: new Error("Save failed"), isError: true }));
    hooks.transfer.mockReturnValue(
      mutation({ error: new Error("Transfer failed"), isError: true }),
    );
    hooks.remove.mockReturnValue(mutation({ error: new Error("Delete failed"), isError: true }));

    const container = await renderSettings();

    expect(container.textContent).toContain("Save failed");
    expect(container.textContent).toContain("Transfer failed");
    expect(container.textContent).toContain("Delete failed");
  });

  test("shows only settings actions granted by the target organization", async () => {
    mockSettings();

    const container = await renderSettings();

    expect(container.textContent).not.toContain("Identity");
    expect(container.textContent).not.toContain("Transfer ownership");
    expect(container.textContent).not.toContain("Danger zone");
  });

  test("confirms organization deletion through the protected action", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    mockSettings({ canDeleteOrganization: true });
    hooks.remove.mockReturnValue(mutation({ mutateAsync: remove }));

    const container = await renderSettings();
    const action = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Delete organization",
    );
    await act(async () => action?.click());
    const confirm = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Delete permanently",
    );
    await act(async () => confirm?.click());

    expect(remove).toHaveBeenCalledWith(7);
  });

  test("separates invitation creation from invitation management permissions", async () => {
    hooks.dashboard.mockReturnValue({
      data: {
        organization,
        permissions: permissions({
          canInviteMembers: true,
        }),
      },
      isError: false,
    });
    hooks.invitations.mockReturnValue({ data: [] });
    hooks.invitationCandidates.mockReturnValue({ data: [] });
    hooks.roles.mockReturnValue({ data: { roles: [] } });

    const container = await renderInvitations();

    expect(container.textContent).toContain("Invite member");
    expect(container.textContent).not.toContain("Bulk revoke");
    expect(container.textContent).not.toContain("Resend");
    expect(container.textContent).not.toContain("Copy");
    expect(container.textContent).not.toContain("Revoke");
  });

  test("opens role details in a modal for a manage-roles-only user", async () => {
    mockSettings({ canManageMemberRoles: true });
    hooks.roles.mockReturnValue({
      data: {
        permissionCatalog: [],
        roles: [
          {
            actions: {
              canAssign: true,
              canDelete: false,
              canDuplicate: false,
              canEdit: false,
              canView: true,
            },
            description: "Reviews predictions",
            id: 9,
            locked: false,
            name: "Reviewer",
            permissions: [],
            scope: "ORGANIZATION",
            slug: "reviewer",
            userCount: 2,
          },
        ],
        templates: [],
      },
    });

    const container = await renderRoles();
    const role = [...container.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Reviewer"),
    );
    await act(async () => role?.click());

    const dialog = container.querySelector("dialog");
    expect(dialog?.textContent).toContain("Reviewer");
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Close role details");
    await act(async () => dialog?.dispatchEvent(new Event("cancel", { cancelable: true })));
    expect(container.querySelector("dialog")).toBeNull();
  });

  test("shows loading and rejects a failed target organization query", async () => {
    mockSettings();
    hooks.dashboard.mockReturnValueOnce({ data: undefined, isError: false, isLoading: true });
    expect((await renderSettings()).textContent).toContain("Loading organization settings...");

    act(() => root?.unmount());
    root = null;
    hooks.dashboard.mockReturnValueOnce({
      data: undefined,
      error: new Error("Server failed"),
      isError: true,
      isLoading: false,
    });
    expect((await renderSettings()).textContent).toContain("Something went wrong");
  });
});
