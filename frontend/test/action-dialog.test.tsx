// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";
import { useActionDialog } from "@/shared/ui/use-action-dialog";

let api: ReturnType<typeof useActionDialog>;
function Harness() {
  api = useActionDialog();
  return api.dialog;
}

const button = (text: string) =>
  [...document.querySelectorAll("button")].find((node) => node.textContent === text)!;

describe("action dialog", () => {
  let root: Root;

  beforeEach(() => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    root = createRoot(document.body.appendChild(document.createElement("div")));
    act(() => root.render(<Harness />));
  });

  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
  });

  it("confirms with a danger action and resolves false when cancelled", async () => {
    let answer: Promise<boolean>;
    act(() => {
      answer = api.confirm({ title: "Delete model?", confirmLabel: "Delete", danger: true });
    });
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Delete model?");
    expect(button("Delete").className).toContain("text-danger-fg");
    await act(async () => button("Delete").click());
    await expect(answer!).resolves.toBe(true);

    act(() => {
      answer = api.confirm({ title: "Archive?", confirmLabel: "Archive" });
    });
    await act(async () => button("Cancel").click());
    await expect(answer!).resolves.toBe(false);
    expect(document.querySelector('[role="dialog"]')).toBeNull();
  });

  it("prompts for a trimmed value and refuses an empty one", async () => {
    let answer: Promise<string | null>;
    act(() => {
      answer = api.prompt({
        title: "Rename model",
        confirmLabel: "Save name",
        input: { label: "Model name", defaultValue: "Risk" },
      });
    });
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Model name"]')!;
    const setValue = (value: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(
          input,
          value,
        );
        input.dispatchEvent(new Event("input", { bubbles: true }));
      });

    setValue("   ");
    expect(button("Save name").disabled).toBe(true);
    setValue("  Risk v2 ");
    await act(async () => button("Save name").click());
    await expect(answer!).resolves.toBe("Risk v2");
  });
});
