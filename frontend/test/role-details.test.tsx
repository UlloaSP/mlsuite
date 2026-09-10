// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, test, vi } from "vite-plus/test";
import { RoleDetailsDialog } from "@/features/workspace/components/RoleDetailsDialog";
import type { RoleDefinitionDto } from "@/features/workspace/api/workspace.types";

let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});
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
    await act(async () =>
      root.render(
        <RoleDetailsDialog
          role={role}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDuplicate={vi.fn()}
          onDelete={onDelete}
        />,
      ),
    );
    const button = [...container.querySelectorAll("button")].find(
      (button) => button.textContent === "Delete",
    )!;
    expect(button.disabled).toBe(userCount > 0);
    await act(async () => button.click());
    expect(onDelete).toHaveBeenCalledTimes(userCount > 0 ? 0 : 1);
    expect(container.textContent?.includes("Assign these users to another role")).toBe(
      userCount > 0,
    );
  },
);
