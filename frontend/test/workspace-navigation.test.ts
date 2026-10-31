import { describe, expect, it } from "vite-plus/test";
import { getWorkspaceLinks, isWorkspacePath } from "@/app/components/workspace-navigation";
import type { WorkspacePermissionsDto } from "@/shared/api/openapi.gen";

const TEAM = { id: 7, kind: "TEAM" } as const;
const permissions = (granted: Partial<WorkspacePermissionsDto>) =>
  ({ canViewWorkspace: true, ...granted }) as WorkspacePermissionsDto;
const labels = (granted: Partial<WorkspacePermissionsDto>) =>
  getWorkspaceLinks(permissions(granted), TEAM).map(({ label }) => label);

describe("workspace navigation in the organization switcher", () => {
  it("lists every page of the active organization for a full-access member", () => {
    expect(
      getWorkspaceLinks(
        permissions({
          canViewMembers: true,
          canViewInvitations: true,
          canViewAuditLog: true,
          canViewOrganization: true,
        }),
        TEAM,
      ).map(({ label, to }) => [label, to]),
    ).toEqual([
      ["Overview", "/workspace"],
      ["Members", "/workspace/organizations/7/members"],
      ["Invitations", "/workspace/organizations/7/invitations"],
      ["Roles & templates", "/workspace/organizations/7/roles"],
      ["Audit log", "/workspace/organizations/7/audit-log"],
      ["Settings", "/workspace/organizations/7/settings"],
    ]);
  });

  it("offers the audit log only while the role grants it", () => {
    expect(labels({ canViewAuditLog: true })).toEqual(["Overview", "Audit log"]);
    expect(labels({ canViewAuditLog: false, canViewOrganization: true })).toEqual([
      "Overview",
      "Settings",
    ]);
  });

  it("offers only the pages the member may open", () => {
    expect(labels({})).toEqual(["Overview"]);
    expect(labels({ canInviteMembers: true })).toEqual([
      "Overview",
      "Invitations",
      "Roles & templates",
    ]);
    expect(labels({ canManageMemberRoles: true })).toEqual(["Overview", "Roles & templates"]);
  });

  it("offers nothing without workspace access", () => {
    expect(
      getWorkspaceLinks(
        { canViewWorkspace: false, canViewMembers: true } as WorkspacePermissionsDto,
        TEAM,
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
