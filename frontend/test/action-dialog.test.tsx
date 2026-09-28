// @vitest-environment jsdom

import { act } from "react";
import { beforeEach, describe, expect, it } from "vite-plus/test";
import { useActionDialog } from "@/shared/ui/use-action-dialog";
import { buttonByText, changeValue, click, mount } from "./support/dom";

let api: ReturnType<typeof useActionDialog>;
function Harness() {
  api = useActionDialog();
  return api.dialog;
}

const button = (text: string) => buttonByText(text)!;

describe("action dialog", () => {
  beforeEach(async () => {
    await mount(<Harness />);
  });

  it("confirms with a danger action and resolves false when cancelled", async () => {
    let answer: Promise<boolean>;
    act(() => {
      answer = api.confirm({ title: "Delete model?", confirmLabel: "Delete", danger: true });
    });
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Delete model?");
    expect(button("Delete").className).toContain("text-danger-fg");
    await click("Delete");
    await expect(answer!).resolves.toBe(true);

    act(() => {
      answer = api.confirm({ title: "Archive?", confirmLabel: "Archive" });
    });
    await click("Cancel");
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

    await changeValue(input, "   ");
    expect(button("Save name").disabled).toBe(true);
    await changeValue(input, "  Risk v2 ");
    await click("Save name");
    await expect(answer!).resolves.toBe("Risk v2");
  });
});
