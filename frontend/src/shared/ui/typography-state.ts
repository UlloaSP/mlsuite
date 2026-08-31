/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type InterfaceFont = "cereal" | "segoe" | "avenir" | "system";
export type MonospaceFont = "dm-mono" | "consolas" | "system-mono";
export type TypographyPreferences = {
  interfaceFont: InterfaceFont;
  interfaceSize: number;
  monospaceFont: MonospaceFont;
  monospaceSize: number;
  wordWrap: boolean;
};

export const INTERFACE_FONTS = [
  { label: "Manrope", value: "cereal" },
  { label: "IBM Plex Sans", value: "segoe" },
  { label: "Source Sans 3", value: "avenir" },
  { label: "System UI", value: "system" },
] as const;

export const MONOSPACE_FONTS = [
  { label: "DM Mono", value: "dm-mono" },
  { label: "Consolas", value: "consolas" },
  { label: "System monospace", value: "system-mono" },
] as const;

export const INTERFACE_SIZES = [14, 15, 16, 17, 18] as const;
export const MONOSPACE_SIZES = [12, 13, 14, 15, 16] as const;
export const MONOSPACE_STACKS: Record<MonospaceFont, string> = {
  "dm-mono": "'DM Mono', 'Consolas', ui-monospace, monospace",
  consolas: "'Consolas', 'Courier New', monospace",
  "system-mono": "ui-monospace, 'SFMono-Regular', Menlo, monospace",
};
export const INTERFACE_STACKS: Record<InterfaceFont, string> = {
  cereal: "'Manrope', 'Trebuchet MS', sans-serif",
  segoe: "'IBM Plex Sans', Arial, sans-serif",
  avenir: "'Source Sans 3', Verdana, sans-serif",
  system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
};
const STORAGE_KEY = "ui/typography";
const DEFAULTS: TypographyPreferences = {
  interfaceFont: "cereal",
  interfaceSize: 16,
  monospaceFont: "dm-mono",
  monospaceSize: 13,
  wordWrap: true,
};

const interfaceFontValues = new Set<string>(INTERFACE_FONTS.map(({ value }) => value));
const monospaceFontValues = new Set<string>(MONOSPACE_FONTS.map(({ value }) => value));

export const isTypographyPreferences = (value: unknown): value is TypographyPreferences => {
  if (!value || typeof value !== "object") return false;
  const preferences = value as Record<string, unknown>;
  return (
    typeof preferences.interfaceFont === "string" &&
    interfaceFontValues.has(preferences.interfaceFont) &&
    typeof preferences.monospaceFont === "string" &&
    monospaceFontValues.has(preferences.monospaceFont) &&
    INTERFACE_SIZES.includes(preferences.interfaceSize as (typeof INTERFACE_SIZES)[number]) &&
    MONOSPACE_SIZES.includes(preferences.monospaceSize as (typeof MONOSPACE_SIZES)[number]) &&
    typeof preferences.wordWrap === "boolean"
  );
};

const readTypography = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    return isTypographyPreferences(parsed) ? parsed : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
};

export const applyTypography = (preferences: TypographyPreferences) => {
  const root = document.documentElement;
  root.dataset.interfaceFont = preferences.interfaceFont;
  root.dataset.monospaceFont = preferences.monospaceFont;
  root.dataset.wordWrap = String(preferences.wordWrap);
  root.style.setProperty("--ui-font-size", `${preferences.interfaceSize}px`);
  root.style.setProperty("--code-font-size", `${preferences.monospaceSize}px`);
  root.style.setProperty("--font-sans", INTERFACE_STACKS[preferences.interfaceFont]);
  root.style.setProperty("--font-display", INTERFACE_STACKS[preferences.interfaceFont]);
  root.style.setProperty("--font-mono", MONOSPACE_STACKS[preferences.monospaceFont]);
};

const storedTypographyAtom = atomWithStorage<unknown>(STORAGE_KEY, readTypography(), undefined, {
  getOnInit: true,
});

export const typographyAtom = atom(
  (get) => {
    const value = get(storedTypographyAtom);
    return isTypographyPreferences(value) ? value : DEFAULTS;
  },
  (_, set, preferences: TypographyPreferences) => {
    const safe = isTypographyPreferences(preferences) ? preferences : DEFAULTS;
    applyTypography(safe);
    set(storedTypographyAtom, safe);
  },
);

typographyAtom.onMount = (setTypography) => setTypography(readTypography());
