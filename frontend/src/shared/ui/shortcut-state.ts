/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ShortcutId = "global-search" | "toggle-theme" | "toggle-fullscreen" | "toggle-sidebar";
export type ShortcutBinding = {
  key: string;
  mod: boolean;
  alt: boolean;
  shift: boolean;
};
export type ShortcutBindings = Record<ShortcutId, ShortcutBinding>;
export type ShortcutEvent = {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
};

export const SHORTCUT_ACTIONS = [
  { id: "global-search", label: "Global Search", description: "Open workspace search." },
  {
    id: "toggle-theme",
    label: "Toggle Color Scheme",
    description: "Cycle System, Light, and Dark.",
  },
  { id: "toggle-fullscreen", label: "Toggle Fullscreen", description: "Enter or exit fullscreen." },
  { id: "toggle-sidebar", label: "Toggle Sidebar", description: "Collapse or expand navigation." },
] as const satisfies readonly { id: ShortcutId; label: string; description: string }[];

export const DEFAULT_SHORTCUTS: ShortcutBindings = {
  "global-search": { key: "k", mod: true, alt: false, shift: false },
  "toggle-theme": { key: "l", mod: true, alt: false, shift: true },
  "toggle-fullscreen": { key: "f", mod: true, alt: false, shift: true },
  "toggle-sidebar": { key: "b", mod: true, alt: false, shift: false },
};

const STORAGE_KEY = "ui/keybindings";
const SHORTCUT_IDS = SHORTCUT_ACTIONS.map(({ id }) => id);

const isBinding = (value: unknown): value is ShortcutBinding => {
  if (!value || typeof value !== "object") return false;
  const binding = value as Record<string, unknown>;
  return (
    typeof binding.key === "string" &&
    binding.key.length === 1 &&
    typeof binding.mod === "boolean" &&
    typeof binding.alt === "boolean" &&
    typeof binding.shift === "boolean" &&
    (binding.mod || binding.alt)
  );
};

export const shortcutSignature = (binding: ShortcutBinding) =>
  `${binding.mod ? "mod+" : ""}${binding.alt ? "alt+" : ""}${binding.shift ? "shift+" : ""}${binding.key.toLowerCase()}`;

const BROWSER_RESERVED_KEYS = new Set(["l", "t", "w", "n", "r", "q", "s", "o", "p", "u"]);

export const reservedShortcutReason = (binding: ShortcutBinding): string | null => {
  if (binding.alt && !binding.mod && /^[1-9]$/.test(binding.key)) {
    return "Alt plus a number is reserved for sidebar navigation.";
  }
  if (
    binding.mod &&
    !binding.alt &&
    !binding.shift &&
    BROWSER_RESERVED_KEYS.has(binding.key.toLowerCase())
  ) {
    return "That shortcut is reserved by the browser.";
  }
  return null;
};

export const isReservedShortcut = (binding: ShortcutBinding) =>
  reservedShortcutReason(binding) !== null;

export const isShortcutBindings = (value: unknown): value is ShortcutBindings => {
  if (!value || typeof value !== "object") return false;
  const bindings = value as Record<string, unknown>;
  if (
    !SHORTCUT_IDS.every(
      (id) => isBinding(bindings[id]) && !isReservedShortcut(bindings[id] as ShortcutBinding),
    )
  ) {
    return false;
  }
  return (
    new Set(SHORTCUT_IDS.map((id) => shortcutSignature(bindings[id] as ShortcutBinding))).size ===
    SHORTCUT_IDS.length
  );
};

const readBindings = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SHORTCUTS;
    const parsed: unknown = JSON.parse(raw);
    return isShortcutBindings(parsed) ? parsed : DEFAULT_SHORTCUTS;
  } catch {
    return DEFAULT_SHORTCUTS;
  }
};

const storedBindingsAtom = atomWithStorage<unknown>(STORAGE_KEY, readBindings(), undefined, {
  getOnInit: true,
});

export const shortcutBindingsAtom = atom(
  (get) => {
    const value = get(storedBindingsAtom);
    return isShortcutBindings(value) ? value : DEFAULT_SHORTCUTS;
  },
  (_, set, bindings: ShortcutBindings) =>
    set(storedBindingsAtom, isShortcutBindings(bindings) ? bindings : DEFAULT_SHORTCUTS),
);

shortcutBindingsAtom.onMount = (setBindings) => setBindings(readBindings());

export const matchesShortcut = (event: ShortcutEvent, binding: ShortcutBinding) =>
  event.key.toLowerCase() === binding.key &&
  Boolean(event.ctrlKey || event.metaKey) === binding.mod &&
  Boolean(event.altKey) === binding.alt &&
  Boolean(event.shiftKey) === binding.shift;

export const bindingFromKeyboardEvent = (event: KeyboardEvent): ShortcutBinding | null => {
  if (event.key.length !== 1 || (!event.ctrlKey && !event.metaKey && !event.altKey)) return null;
  return {
    key: event.key.toLowerCase(),
    mod: Boolean(event.ctrlKey || event.metaKey),
    alt: Boolean(event.altKey),
    shift: Boolean(event.shiftKey),
  };
};

export const shortcutLabels = (
  binding: ShortcutBinding,
  isMac = typeof navigator !== "undefined" && /mac/i.test(navigator.platform),
) => [
  ...(binding.mod ? [isMac ? "⌘" : "Ctrl"] : []),
  ...(binding.alt ? [isMac ? "⌥" : "Alt"] : []),
  ...(binding.shift ? ["Shift"] : []),
  binding.key.toUpperCase(),
];

export const shortcutToAria = (binding: ShortcutBinding) => {
  const suffix = [
    binding.alt ? "Alt" : null,
    binding.shift ? "Shift" : null,
    binding.key.toUpperCase(),
  ]
    .filter(Boolean)
    .join("+");
  return binding.mod ? `Control+${suffix} Meta+${suffix}` : suffix;
};
