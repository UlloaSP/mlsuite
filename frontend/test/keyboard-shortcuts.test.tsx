// @vitest-environment jsdom
import { act } from "react";
import { describe, expect, it, vi } from "vite-plus/test";
import {
  bindingFromKeyboardEvent,
  DEFAULT_SHORTCUTS,
  isShortcutBindings,
} from "@/shared/ui/shortcut-state";
import { useShortcut } from "@/shared/ui/use-shortcut";
import { mount } from "./support/dom";

function GlobalSearchShortcut({ onOpen }: { onOpen: () => void }) {
  useShortcut("global-search", onOpen);
  return <input aria-label="Run notes" />;
}

const press = (target: Element, init: KeyboardEventInit) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, ...init }));
  });

describe("keyboard shortcuts", () => {
  it("opens global search with Ctrl+K or Cmd+K and leaves slash and a bare K alone", async () => {
    const open = vi.fn();
    await mount(<GlobalSearchShortcut onOpen={open} />);

    press(document.body, { key: "k", ctrlKey: true });
    press(document.body, { key: "K", metaKey: true });
    expect(open).toHaveBeenCalledTimes(2);

    press(document.body, { key: "/", shiftKey: true });
    press(document.body, { key: "k" });
    press(document.body, { key: "k", altKey: true });
    expect(open).toHaveBeenCalledTimes(2);
  });

  it("leaves a shortcut typed in a text field to the field", async () => {
    const open = vi.fn();
    const { host } = await mount(<GlobalSearchShortcut onOpen={open} />);

    press(host.querySelector("input")!, { key: "k", ctrlKey: true });

    expect(open).not.toHaveBeenCalled();
  });

  it("records and rejects conflicting editable shortcuts", () => {
    expect(bindingFromKeyboardEvent({ key: "g", ctrlKey: true } as KeyboardEvent)).toEqual({
      key: "g",
      mod: true,
      alt: false,
      shift: false,
    });
    expect(bindingFromKeyboardEvent({ key: "g" } as KeyboardEvent)).toBeNull();
    expect(
      isShortcutBindings({
        ...DEFAULT_SHORTCUTS,
        "toggle-theme": DEFAULT_SHORTCUTS["global-search"],
      }),
    ).toBe(false);
    expect(
      isShortcutBindings({
        ...DEFAULT_SHORTCUTS,
        "toggle-sidebar": { key: "1", mod: false, alt: true, shift: false },
      }),
    ).toBe(false);
    expect(
      isShortcutBindings({
        ...DEFAULT_SHORTCUTS,
        "toggle-sidebar": { key: "l", mod: true, alt: false, shift: false },
      }),
    ).toBe(false);
  });
});
