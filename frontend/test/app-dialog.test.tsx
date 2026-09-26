// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";
import { AppDialog } from "@/shared/ui/AppDialog";

describe("AppDialog", () => {
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    root = createRoot(document.body.appendChild(document.createElement("div")));
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
  });

  const pressEscape = () =>
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

  it("labels the dialog, moves focus into it, and closes on Escape", () => {
    const onClose = vi.fn();
    act(() =>
      root.render(
        <AppDialog open onClose={onClose} title="Delete user?" description="This cannot be undone.">
          Body
        </AppDialog>,
      ),
    );

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    const labelledBy = document.getElementById(dialog.getAttribute("aria-labelledby")!);
    const describedBy = document.getElementById(dialog.getAttribute("aria-describedby")!);
    expect(labelledBy?.textContent).toBe("Delete user?");
    expect(describedBy?.textContent).toBe("This cannot be undone.");
    expect(dialog.contains(document.activeElement)).toBe(true);

    pressEscape();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("stays open while busy", () => {
    const onClose = vi.fn();
    act(() => root.render(<AppDialog open busy onClose={onClose} title="Saving" />));

    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("submits body and footer as one form", () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    act(() =>
      root.render(
        <AppDialog
          open
          onClose={vi.fn()}
          title="Rename"
          onSubmit={onSubmit}
          footer={<button type="submit">Save</button>}
        >
          <input aria-label="Name" defaultValue="Acme" />
        </AppDialog>,
      ),
    );

    act(() => document.querySelector<HTMLButtonElement>('button[type="submit"]')!.click());
    expect(onSubmit).toHaveBeenCalledOnce();
  });
  it("shows a failed action inside the dialog, next to the footer", () => {
    act(() =>
      root.render(
        <AppDialog
          open
          onClose={vi.fn()}
          title="Delete user?"
          error="User still owns an organization."
          footer={<button type="button">Delete</button>}
        />,
      ),
    );

    const alert = document.querySelector('[role="dialog"] [role="alert"]');
    expect(alert?.textContent).toBe("User still owns an organization.");
  });
});
