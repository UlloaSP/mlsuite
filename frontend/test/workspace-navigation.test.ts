import { describe, expect, it } from "vite-plus/test";
import { getWorkspaceLinks, isWorkspacePath } from "@/app/components/workspace-navigation";
import type { WorkspacePermissionsDto } from "@/capabilities/workspace-context/workspace-context.types";

const permissions = (granted: Partial<WorkspacePermissionsDto>) =>
  ({ canViewWorkspace: true, ...granted }) as WorkspacePermissionsDto;
const labels = (granted: Partial<WorkspacePermissionsDto>) =>
  getWorkspaceLinks(permissions(granted), 7).map(({ label }) => label);

describe("workspace navigation in the organization switcher", () => {
  it("lists every page of the active organization for a full-access member", () => {
    expect(
      getWorkspaceLinks(
        permissions({ canViewMembers: true, canViewInvitations: true, canViewOrganization: true }),
        7,
      ).map(({ label, to }) => [label, to]),
    ).toEqual([
      ["Overview", "/workspace"],
      ["Members", "/workspace/organizations/7/members"],
      ["Invitations", "/workspace/organizations/7/invitations"],
      ["Roles & Templates", "/workspace/organizations/7/roles"],
      ["Settings", "/workspace/organizations/7/settings"],
    ]);
  });

  it("offers only the pages the member may open", () => {
    expect(labels({})).toEqual(["Overview"]);
    expect(labels({ canInviteMembers: true })).toEqual([
      "Overview",
      "Invitations",
      "Roles & Templates",
    ]);
    expect(labels({ canManageMemberRoles: true })).toEqual(["Overview", "Roles & Templates"]);
  });

  it("offers nothing without workspace access", () => {
    expect(
      getWorkspaceLinks(
        { canViewWorkspace: false, canViewMembers: true } as WorkspacePermissionsDto,
        7,
      ),
    ).toEqual([]);
  });

  it("marks only the active organization's workspace pages as current", () => {
    expect(isWorkspacePath("/workspace", 7)).toBe(true);
    expect(isWorkspacePath("/workspace/organizations/7/members", 7)).toBe(true);
    expect(isWorkspacePath("/workspace/organizations/8/members", 7)).toBe(false);
    expect(isWorkspacePath("/workspace/organizations", 7)).toBe(false);
    expect(isWorkspacePath("/models", 7)).toBe(false);
  });
});
