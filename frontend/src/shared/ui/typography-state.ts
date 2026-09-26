/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

import {
  INTERFACE_FONTS,
  INTERFACE_STACKS,
  LEGACY_FONT_IDS,
  MONOSPACE_FONTS,
  MONOSPACE_STACKS,
  type InterfaceFont,
  type MonospaceFont,
} from "./font-catalog";

export type TypographyPreferences = {
  interfaceFont: InterfaceFont;
  interfaceSize: number;
  monospaceFont: MonospaceFont;
  monospaceSize: number;
  wordWrap: boolean;
};

export const INTERFACE_SIZES = [14, 15, 16, 17, 18] as const;
export const MONOSPACE_SIZES = [12, 13, 14, 15, 16] as const;
const STORAGE_KEY = "ui/typography";
const DEFAULTS: TypographyPreferences = {
  interfaceFont: "manrope",
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

const withCurrentFontIds = (value: unknown) => {
  if (!value || typeof value !== "object") return null;
  const stored = value as Record<string, unknown>;
  const current = {
    ...stored,
    interfaceFont: LEGACY_FONT_IDS[String(stored.interfaceFont)] ?? stored.interfaceFont,
    monospaceFont: LEGACY_FONT_IDS[String(stored.monospaceFont)] ?? stored.monospaceFont,
  };
  return isTypographyPreferences(current) ? current : null;
};

const readTypography = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    return isTypographyPreferences(parsed) ? parsed : (withCurrentFontIds(parsed) ?? DEFAULTS);
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
  root.style.setProperty("--font-mono", MONOSPACE_STACKS[preferences.monospaceFont]);
};

const storedTypographyAtom = atomWithStorage<unknown>(STORAGE_KEY, readTypography(), undefined, {
  getOnInit: true,
});

export const typographyAtom = atom(
  (get) => {
    const value = get(storedTypographyAtom);
    return isTypographyPreferences(value) ? value : (withCurrentFontIds(value) ?? DEFAULTS);
  },
  (_, set, preferences: TypographyPreferences) => {
    const safe = isTypographyPreferences(preferences) ? preferences : DEFAULTS;
    applyTypography(safe);
    set(storedTypographyAtom, safe);
  },
);

typographyAtom.onMount = (setTypography) => setTypography(readTypography());
