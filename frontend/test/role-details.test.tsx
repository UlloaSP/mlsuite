// @vitest-environment jsdom
import { expect, test, vi } from "vite-plus/test";
import { RoleDetailsDialog } from "@/features/workspace/components/RoleDetailsDialog";
import type { RoleDefinitionDto } from "@/features/workspace/api/workspace.types";
import { buttonByText, click, mount } from "./support/dom";

test.each([0, 2])(
  "requires reassignment before deleting a role with %i users",
  async (userCount) => {
    const role: RoleDefinitionDto = {
      id: 9,
      name: "QA Reviewer",
      slug: "qa-reviewer",
      description: "Reviews",
      scope: "ORGANIZATION",
      locked: false,
      userCount,
      permissions: [],
      actions: {
        canView: true,
        canEdit: true,
        canDelete: true,
        canDuplicate: true,
        canAssign: true,
      },
    };
    const onDelete = vi.fn();
    await mount(
      <RoleDetailsDialog
        role={role}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={onDelete}
      />,
    );
    const button = buttonByText("Delete")!;
    expect(button.disabled).toBe(userCount > 0);
    await click(button);
    expect(onDelete).toHaveBeenCalledTimes(userCount > 0 ? 0 : 1);
    expect(document.body.textContent?.includes("Assign these users to another role")).toBe(
      userCount > 0,
    );
  },
);

test("never offers delete for a locked role", async () => {
  const role: RoleDefinitionDto = {
    id: 1,
    name: "Owner",
    slug: "owner",
    description: "Full control",
    scope: "ORGANIZATION",
    locked: true,
    systemKey: "OWNER",
    userCount: 0,
    permissions: [],
    actions: {
      canView: true,
      canEdit: false,
      canDelete: true,
      canDuplicate: true,
      canAssign: true,
    },
  };
  await mount(
    <RoleDetailsDialog
      role={role}
      onClose={vi.fn()}
      onEdit={vi.fn()}
      onDuplicate={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  const labels = [...document.body.querySelectorAll("button")].map((button) => button.textContent);
  expect(labels).toContain("Duplicate");
  expect(labels).not.toContain("Delete");
});
