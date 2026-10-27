// @vitest-environment jsdom

import { act } from "react";
import { expect, test, vi } from "vite-plus/test";
import { ModelActionsMenu } from "@/features/models/components/ModelActionsMenu";
import { mount } from "./support/dom";

type Permissions = { canDelete: boolean; canDuplicate: boolean; canEdit: boolean };
const NONE: Permissions = { canDelete: false, canDuplicate: false, canEdit: false };

/** The menu opens from the keyboard in jsdom and renders in a portal on the body. */
async function openMenu(archived: boolean, permissions: Partial<Permissions>) {
  const { host } = await mount(
    <ModelActionsMenu
      archived={archived}
      {...NONE}
      {...permissions}
      modelName="QA"
      onAction={vi.fn()}
    />,
  );
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Open actions for QA"]');
  if (!trigger) return null;
  await act(async () =>
    trigger.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  return [...document.body.querySelectorAll('[role="menuitem"]')].map((item) =>
    item.textContent?.trim(),
  );
}

test.each([false, true])(
  "offers archive for an active model and restore for an archived one, archived=%s",
  async (archived) => {
    const items = await openMenu(archived, { canEdit: true, canDelete: true });
    expect(items?.includes("Archive")).toBe(!archived);
    expect(items?.includes("Restore")).toBe(archived);
    expect(items).toContain("Delete");
  },
);

test("does not offer restore to a member who cannot edit models", async () => {
  expect(await openMenu(true, { canDuplicate: true })).toEqual(["Duplicate"]);
});

test("does not offer duplicate to a member who can edit but not create models", async () => {
  expect(await openMenu(false, { canEdit: true })).toEqual(["Edit", "Archive"]);
});

test("offers only duplicate to a member who can create but not edit models", async () => {
  expect(await openMenu(false, { canDuplicate: true })).toEqual(["Duplicate"]);
});

test("renders no menu without any model permission", async () => {
  expect(await openMenu(false, {})).toBeNull();
});
