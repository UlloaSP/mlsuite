/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { validatedStorage } from "@/shared/lib/validated-storage";

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

const storedTypographyAtom = atomWithStorage(
  STORAGE_KEY,
  DEFAULTS,
  validatedStorage(isTypographyPreferences),
  { getOnInit: true },
);

export const typographyAtom = atom(
  (get) => get(storedTypographyAtom),
  (_, set, preferences: TypographyPreferences) => {
    set(storedTypographyAtom, preferences);
    applyTypography(preferences);
  },
);
