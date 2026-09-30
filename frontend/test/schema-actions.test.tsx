// @vitest-environment jsdom
import { act } from "react";
import { expect, test, vi } from "vite-plus/test";
import { SchemaActionsMenu } from "@/features/schemas/components/SchemaActionsMenu";
import { mount } from "./support/dom";

test.each([false, true])("archive action respects archived=%s", async (archived) => {
  const { host } = await mount(
    <SchemaActionsMenu archived={archived} canDelete canEdit onAction={vi.fn()} schemaName="QA" />,
  );
  // The menu opens from the keyboard in jsdom and renders in a portal on the body.
  await act(async () =>
    host
      .querySelector("button")!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
  );
  const labels = [...document.body.querySelectorAll('[role="menuitem"]')].map(
    (item) => item.textContent,
  );
  expect(labels.includes("Archive")).toBe(!archived);
  expect(labels).toContain("Delete");
  expect(labels).toContain("Duplicate");
});
