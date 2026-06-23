import { describe, expect, it } from "vite-plus/test";
import { isModShortcut, shortcutDigit } from "../src/app/utils/keyboard-shortcuts";

describe("keyboard shortcut helpers", () => {
  it("reads Alt navigation digits from 1 through 9", () => {
    expect(shortcutDigit({ key: "1", altKey: true })).toBe(1);
    expect(shortcutDigit({ key: "9", altKey: true, shiftKey: true })).toBe(9);
    expect(shortcutDigit({ key: "!", altKey: true, shiftKey: true })).toBe(1);
  });

  it("rejects non-navigation digit keys", () => {
    expect(shortcutDigit({ key: "0", altKey: true })).toBeNull();
    expect(shortcutDigit({ key: "a", altKey: true })).toBeNull();
  });

  it("matches Ctrl/Cmd shortcuts without Alt and with the requested Shift state", () => {
    expect(isModShortcut({ key: "l", ctrlKey: true, shiftKey: true }, "l", true)).toBe(true);
    expect(isModShortcut({ key: "F", metaKey: true, shiftKey: true }, "f", true)).toBe(true);
    expect(isModShortcut({ key: "b", ctrlKey: true }, "b")).toBe(true);
    expect(
      isModShortcut({ key: "l", ctrlKey: true, altKey: true, shiftKey: true }, "l", true),
    ).toBe(false);
    expect(isModShortcut({ key: "l", ctrlKey: true }, "l", true)).toBe(false);
  });
});
