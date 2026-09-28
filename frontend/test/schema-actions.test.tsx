// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, test, vi } from "vite-plus/test";
import { SchemaActionsMenu } from "@/features/schemas/components/SchemaActionsMenu";

test.each([false, true])("archive action respects archived=%s", async (archived) => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <SchemaActionsMenu
          archived={archived}
          canDelete
          canEdit
          onAction={vi.fn()}
          schemaName="QA"
        />,
      ),
    );
    // The menu opens from the keyboard in jsdom and renders in a portal on the body.
    await act(async () =>
      container
        .querySelector("button")!
        .dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })),
    );
    const labels = [...document.body.querySelectorAll('[role="menuitem"]')].map(
      (item) => item.textContent,
    );
    expect(labels.includes("Archive")).toBe(!archived);
    expect(labels).toContain("Delete");
    expect(labels).toContain("Duplicate");
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
