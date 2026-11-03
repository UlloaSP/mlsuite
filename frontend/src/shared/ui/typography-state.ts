/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { ReadonlyAtom } from "@tanstack/react-store";
import { createPersistedAtom } from "@/shared/lib/persisted-atom";

import {
  INTERFACE_FONTS,
  INTERFACE_STACKS,
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

const isTypographyPreferences = (value: unknown): value is TypographyPreferences => {
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

const applyTypography = (preferences: TypographyPreferences) => {
  const root = document.documentElement;
  root.dataset.interfaceFont = preferences.interfaceFont;
  root.dataset.monospaceFont = preferences.monospaceFont;
  root.dataset.wordWrap = String(preferences.wordWrap);
  root.style.setProperty("--ui-font-size", `${preferences.interfaceSize}px`);
  root.style.setProperty("--code-font-size", `${preferences.monospaceSize}px`);
  root.style.setProperty("--font-sans", INTERFACE_STACKS[preferences.interfaceFont]);
  root.style.setProperty("--font-mono", MONOSPACE_STACKS[preferences.monospaceFont]);
};

const storedTypographyAtom = createPersistedAtom(STORAGE_KEY, DEFAULTS, isTypographyPreferences);

export const typographyAtom: ReadonlyAtom<TypographyPreferences> = storedTypographyAtom;

/** Persists the preferences and applies them to the document. */
export const setTypography = (preferences: TypographyPreferences) => {
  storedTypographyAtom.set(preferences);
  applyTypography(preferences);
};
