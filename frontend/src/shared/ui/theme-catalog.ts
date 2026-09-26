/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type BuiltInThemeId =
  | "mlsuite"
  | "airbnb"
  | "grove"
  | "ocean"
  | "ember"
  | "iris"
  | "graphite"
  | "nord"
  | "catppuccin"
  | "rose-pine"
  | "tokyo-night"
  | "gruvbox"
  | "solarized";
export type CustomThemeId = `custom-${string}`;
export type ThemeId = BuiltInThemeId | CustomThemeId;

export type ThemePalette = {
  background: string;
  surface: string;
  muted: string;
  text: string;
  textMuted: string;
  accent: string;
};

export type CustomTheme = {
  id: CustomThemeId;
  name: string;
  light: ThemePalette;
  dark: ThemePalette;
};

export const THEME_PRESETS = [
  {
    value: "mlsuite",
    label: "MLsuite",
    preview: { light: ["#f7f7fb", "#4f46e5"], dark: ["#0b0d14", "#a9a4ff"] },
  },
  {
    value: "airbnb",
    label: "Airbnb",
    preview: { light: ["#ffffff", "#e61e4d"], dark: ["#1c1918", "#ff5a75"] },
  },
  {
    value: "grove",
    label: "Grove",
    preview: { light: ["#f5f7f1", "#2f7d5a"], dark: ["#111713", "#54d19c"] },
  },
  {
    value: "ocean",
    label: "Ocean",
    preview: { light: ["#f3f8fc", "#1677ff"], dark: ["#0d151d", "#69a9ff"] },
  },
  {
    value: "ember",
    label: "Ember",
    preview: { light: ["#fbf5ef", "#d65a31"], dark: ["#1a1210", "#ff8a62"] },
  },
  {
    value: "iris",
    label: "Iris",
    preview: { light: ["#f8f5fc", "#7047eb"], dark: ["#15111d", "#b69cff"] },
  },
  {
    value: "graphite",
    label: "Graphite",
    preview: { light: ["#fafafa", "#171717"], dark: ["#0a0a0a", "#ededed"] },
  },
  {
    value: "nord",
    label: "Nord",
    preview: { light: ["#e5e9f0", "#5e81ac"], dark: ["#2e3440", "#88c0d0"] },
  },
  {
    value: "catppuccin",
    label: "Catppuccin",
    preview: { light: ["#e6e9ef", "#8839ef"], dark: ["#181825", "#cba6f7"] },
  },
  {
    value: "rose-pine",
    label: "Rosé Pine",
    preview: { light: ["#faf4ed", "#b4637a"], dark: ["#191724", "#ebbcba"] },
  },
  {
    value: "tokyo-night",
    label: "Tokyo Night",
    preview: { light: ["#e1e2e7", "#2e7de9"], dark: ["#16161e", "#7aa2f7"] },
  },
  {
    value: "gruvbox",
    label: "Gruvbox",
    preview: { light: ["#fbf1c7", "#af3a03"], dark: ["#1d2021", "#fe8019"] },
  },
  {
    value: "solarized",
    label: "Solarized",
    preview: { light: ["#eee8d5", "#268bd2"], dark: ["#00212b", "#268bd2"] },
  },
] as const satisfies readonly {
  value: BuiltInThemeId;
  label: string;
  preview: { light: readonly [string, string]; dark: readonly [string, string] };
}[];

export const DEFAULT_CUSTOM_PALETTES = {
  light: {
    background: "#f7f7fb",
    surface: "#ffffff",
    muted: "#eeedf8",
    text: "#161827",
    textMuted: "#626579",
    accent: "#4f46e5",
  },
  dark: {
    background: "#0b0d14",
    surface: "#131620",
    muted: "#232838",
    text: "#f5f5f5",
    textMuted: "#c2c5d4",
    accent: "#a9a4ff",
  },
} as const satisfies { light: ThemePalette; dark: ThemePalette };

const BUILT_IN_IDS = new Set<string>(THEME_PRESETS.map(({ value }) => value));
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export const hasThemePaletteSyntax = (value: unknown): value is ThemePalette => {
  if (!value || typeof value !== "object") return false;
  const palette = value as Record<string, unknown>;
  return ["background", "surface", "muted", "text", "textMuted", "accent"].every(
    (key) => typeof palette[key] === "string" && HEX_COLOR.test(palette[key]),
  );
};

const luminance = (color: string) => {
  const channels = [1, 3, 5].map(
    (start) => Number.parseInt(color.slice(start, start + 2), 16) / 255,
  );
  const [red, green, blue] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};

const contrastRatio = (foreground: string, background: string) => {
  const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
};

export const themePaletteContrastError = (palette: ThemePalette): string | null => {
  if (contrastRatio(palette.text, palette.background) < 4.5) {
    return "Text needs at least 4.5:1 contrast against the background.";
  }
  if (contrastRatio(palette.text, palette.surface) < 4.5) {
    return "Text needs at least 4.5:1 contrast against the surface.";
  }
  if (contrastRatio(palette.textMuted, palette.background) < 4.5) {
    return "Muted text needs at least 4.5:1 contrast against the background.";
  }
  if (contrastRatio(palette.textMuted, palette.surface) < 4.5) {
    return "Muted text needs at least 4.5:1 contrast against the surface.";
  }
  if (contrastRatio(palette.accent, palette.background) < 3) {
    return "Accent needs at least 3:1 contrast against the background.";
  }
  if (contrastRatio(palette.accent, palette.surface) < 3) {
    return "Accent needs at least 3:1 contrast against the surface.";
  }
  return null;
};

export const isThemePalette = (value: unknown): value is ThemePalette =>
  hasThemePaletteSyntax(value) && themePaletteContrastError(value) === null;

export const isCustomTheme = (value: unknown): value is CustomTheme => {
  if (!value || typeof value !== "object") return false;
  const theme = value as Record<string, unknown>;
  return (
    typeof theme.id === "string" &&
    theme.id.startsWith("custom-") &&
    typeof theme.name === "string" &&
    theme.name.trim().length > 0 &&
    isThemePalette(theme.light) &&
    isThemePalette(theme.dark)
  );
};

export const isThemeId = (value: unknown, customThemes: readonly CustomTheme[]): value is ThemeId =>
  typeof value === "string" &&
  (BUILT_IN_IDS.has(value) || customThemes.some(({ id }) => id === value));

export const createCustomTheme = (
  name: string,
  light: ThemePalette,
  dark: ThemePalette,
): CustomTheme => ({
  id: `custom-${globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)}`,
  name: name.trim(),
  light,
  dark,
});

export const paletteCssVariables = (palette: ThemePalette): Record<string, string> => ({
  "--theme-page-bg": palette.background,
  "--theme-page-bg-accent": `color-mix(in oklch, ${palette.accent} 10%, transparent)`,
  "--theme-surface-primary": palette.surface,
  "--theme-surface-secondary": `color-mix(in oklch, ${palette.surface}, ${palette.background} 45%)`,
  "--theme-surface-muted": palette.muted,
  "--theme-surface-inverse": palette.text,
  "--theme-text-primary": palette.text,
  "--theme-text-secondary": palette.textMuted,
  "--theme-text-muted": `color-mix(in oklch, ${palette.textMuted}, ${palette.background} 28%)`,
  "--theme-text-inverse": palette.background,
  "--theme-border-soft": `color-mix(in oklch, ${palette.muted}, ${palette.text} 12%)`,
  "--theme-border-strong": `color-mix(in oklch, ${palette.muted}, ${palette.text} 24%)`,
  "--theme-accent-primary": palette.accent,
  "--theme-accent-primary-strong": `color-mix(in oklch, ${palette.accent}, ${palette.text} 18%)`,
  "--theme-accent-quiet": `color-mix(in oklch, ${palette.accent} 14%, transparent)`,
  "--theme-sidebar-bg": `color-mix(in oklch, ${palette.surface} 94%, transparent)`,
});
