/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

// Every web family here is declared by the single Google Fonts stylesheet in
// index.html. Declaring a face costs nothing; the browser only downloads the
// files of the family that is actually rendered. public/appearance-boot.js keeps
// a copy of the ids and stacks so the preference applies before first paint.

type FontPreset = { value: string; label: string; stack: string };

export const INTERFACE_FONTS = [
  { value: "manrope", label: "Manrope", stack: "'Manrope', 'Trebuchet MS', sans-serif" },
  { value: "inter", label: "Inter", stack: "'Inter', Arial, sans-serif" },
  { value: "geist", label: "Geist", stack: "'Geist', Arial, sans-serif" },
  { value: "ibm-plex-sans", label: "IBM Plex Sans", stack: "'IBM Plex Sans', Arial, sans-serif" },
  { value: "source-sans-3", label: "Source Sans 3", stack: "'Source Sans 3', Verdana, sans-serif" },
  { value: "figtree", label: "Figtree", stack: "'Figtree', Arial, sans-serif" },
  { value: "dm-sans", label: "DM Sans", stack: "'DM Sans', Arial, sans-serif" },
  {
    value: "atkinson-hyperlegible",
    label: "Atkinson Hyperlegible",
    stack: "'Atkinson Hyperlegible Next', Verdana, sans-serif",
  },
  {
    value: "system",
    label: "System UI",
    stack: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
] as const satisfies readonly FontPreset[];

export const MONOSPACE_FONTS = [
  { value: "dm-mono", label: "DM Mono", stack: "'DM Mono', Consolas, ui-monospace, monospace" },
  {
    value: "jetbrains-mono",
    label: "JetBrains Mono",
    stack: "'JetBrains Mono', Consolas, ui-monospace, monospace",
  },
  {
    value: "geist-mono",
    label: "Geist Mono",
    stack: "'Geist Mono', Consolas, ui-monospace, monospace",
  },
  {
    value: "ibm-plex-mono",
    label: "IBM Plex Mono",
    stack: "'IBM Plex Mono', Consolas, ui-monospace, monospace",
  },
  {
    value: "fira-code",
    label: "Fira Code",
    stack: "'Fira Code', Consolas, ui-monospace, monospace",
  },
  {
    value: "source-code-pro",
    label: "Source Code Pro",
    stack: "'Source Code Pro', Consolas, ui-monospace, monospace",
  },
  {
    value: "system-mono",
    label: "System monospace",
    stack: "ui-monospace, 'Cascadia Mono', 'SFMono-Regular', Menlo, Consolas, monospace",
  },
] as const satisfies readonly FontPreset[];

export type InterfaceFont = (typeof INTERFACE_FONTS)[number]["value"];
export type MonospaceFont = (typeof MONOSPACE_FONTS)[number]["value"];

const stacks = <T extends string>(fonts: readonly { value: T; stack: string }[]) =>
  Object.fromEntries(fonts.map(({ value, stack }) => [value, stack])) as Record<T, string>;

export const INTERFACE_STACKS = stacks<InterfaceFont>(INTERFACE_FONTS);
export const MONOSPACE_STACKS = stacks<MonospaceFont>(MONOSPACE_FONTS);

// Ids stored by earlier releases, which named fonts after the families they replaced.
export const LEGACY_FONT_IDS: Record<string, InterfaceFont | MonospaceFont> = {
  cereal: "manrope",
  segoe: "ibm-plex-sans",
  avenir: "source-sans-3",
  consolas: "system-mono",
};
