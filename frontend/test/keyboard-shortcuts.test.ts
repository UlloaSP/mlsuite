import { describe, expect, it } from "vite-plus/test";
import { shortcutDigit } from "@/app/utils/keyboard-shortcuts";
import {
  bindingFromKeyboardEvent,
  DEFAULT_SHORTCUTS,
  isShortcutBindings,
  matchesShortcut,
} from "@/shared/ui/shortcut-state";

describe("keyboard shortcut helpers", () => {
  it("reads Alt navigation digits from 1 through 9", () => {
    expect(shortcutDigit({ key: "1", altKey: true })).toBe(1);
    expect(shortcutDigit({ key: "9", altKey: true, shiftKey: true })).toBe(9);
    expect(shortcutDigit({ key: "!", altKey: true, shiftKey: true })).toBe(1);
    expect(shortcutDigit({ key: ")", code: "Digit9", altKey: true, shiftKey: true })).toBe(9);
    expect(shortcutDigit({ key: "End", code: "Numpad1", altKey: true })).toBe(1);
  });

  it("rejects non-navigation digit keys", () => {
    expect(shortcutDigit({ key: "0", altKey: true })).toBeNull();
    expect(shortcutDigit({ key: "a", altKey: true })).toBeNull();
  });

  it("matches, records, and rejects conflicting editable shortcuts", () => {
    expect(matchesShortcut({ key: "K", ctrlKey: true }, DEFAULT_SHORTCUTS["global-search"])).toBe(
      true,
    );
    expect(matchesShortcut({ key: "k", altKey: true }, DEFAULT_SHORTCUTS["global-search"])).toBe(
      false,
    );
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
