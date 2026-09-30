// @vitest-environment jsdom

import { act } from "react";
import { describe, expect, it, vi } from "vite-plus/test";
import { AppDialog } from "@/shared/ui/AppDialog";
import { click, mount } from "./support/dom";

describe("AppDialog", () => {
  const pressEscape = () =>
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });

  it("labels the dialog, moves focus into it, and closes on Escape", async () => {
    const onClose = vi.fn();
    await mount(
      <AppDialog open onClose={onClose} title="Delete user?" description="This cannot be undone.">
        Body
      </AppDialog>,
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

  it("stays open while busy", async () => {
    const onClose = vi.fn();
    await mount(<AppDialog open busy onClose={onClose} title="Saving" />);

    pressEscape();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("submits body and footer as one form", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    await mount(
      <AppDialog
        open
        onClose={vi.fn()}
        title="Rename"
        onSubmit={onSubmit}
        footer={<button type="submit">Save</button>}
      >
        <input aria-label="Name" defaultValue="Acme" />
      </AppDialog>,
    );

    await click(document.querySelector<HTMLButtonElement>('button[type="submit"]')!);
    expect(onSubmit).toHaveBeenCalledOnce();
  });
  it("shows a failed action inside the dialog, next to the footer", async () => {
    await mount(
      <AppDialog
        open
        onClose={vi.fn()}
        title="Delete user?"
        error="User still owns an organization."
        footer={<button type="button">Delete</button>}
      />,
    );

    const alert = document.querySelector('[role="dialog"] [role="alert"]');
    expect(alert?.textContent).toBe("User still owns an organization.");
  });
});
