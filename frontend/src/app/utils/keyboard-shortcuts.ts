/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type ShortcutEvent = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable);

const SHIFT_DIGITS: Record<string, number> = {
  "!": 1,
  "@": 2,
  "#": 3,
  $: 4,
  "%": 5,
  "^": 6,
  "&": 7,
  "*": 8,
  "(": 9,
};

export const shortcutDigit = (event: ShortcutEvent) => {
  if (/^[1-9]$/.test(event.key)) {
    return Number(event.key);
  }
  return SHIFT_DIGITS[event.key] ?? null;
};

export const isModShortcut = (event: ShortcutEvent, key: string, shiftKey = false) =>
  event.key.toLowerCase() === key.toLowerCase() &&
  (event.ctrlKey || event.metaKey) &&
  !event.altKey &&
  (event.shiftKey === true) === shiftKey;
