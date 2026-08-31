/* SPDX-License-Identifier: MIT; Copyright (c) 2025 Pablo Ulloa Santin */

(function () {
  const KEYS = {
    mode: "ui/color-scheme",
    legacyMode: "ui/theme",
    legacyPreset: "ui/theme-preset",
    selection: "ui/theme-selection",
    contrast: "ui/contrast",
    customThemes: "ui/custom-themes",
    typography: "ui/typography",
  };
  const modes = ["dark", "light", "system"];
  const presets = ["mlsuite", "airbnb", "grove", "ocean", "ember", "iris"];
  const contrasts = [100, 105, 110, 115, 120, 125];
  const interfaceFonts = ["cereal", "segoe", "avenir", "system"];
  const monospaceFonts = ["dm-mono", "consolas", "system-mono"];
  const interfaceStacks = {
    cereal: "'Manrope', 'Trebuchet MS', sans-serif",
    segoe: "'IBM Plex Sans', Arial, sans-serif",
    avenir: "'Source Sans 3', Verdana, sans-serif",
    system: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  };
  const monospaceStacks = {
    "dm-mono": "'DM Mono', 'Consolas', ui-monospace, monospace",
    consolas: "'Consolas', 'Courier New', monospace",
    "system-mono": "ui-monospace, 'SFMono-Regular', Menlo, monospace",
  };
  const interfaceSizes = [14, 15, 16, 17, 18];
  const monospaceSizes = [12, 13, 14, 15, 16];
  const paletteKeys = ["background", "surface", "muted", "text", "textMuted", "accent"];
  const customProperties = [
    "--theme-page-bg",
    "--theme-page-bg-accent",
    "--theme-surface-primary",
    "--theme-surface-secondary",
    "--theme-surface-muted",
    "--theme-surface-inverse",
    "--theme-text-primary",
    "--theme-text-secondary",
    "--theme-text-muted",
    "--theme-text-inverse",
    "--theme-border-soft",
    "--theme-border-strong",
    "--theme-accent-primary",
    "--theme-accent-primary-strong",
    "--theme-accent-quiet",
    "--theme-sidebar-bg",
  ];
  const defaultTypography = {
    interfaceFont: "cereal",
    interfaceSize: 16,
    monospaceFont: "dm-mono",
    monospaceSize: 13,
    wordWrap: true,
  };

  const read = (key) => {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    } catch {
      return null;
    }
  };
  const save = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage may be disabled. Preferences still apply for this page load.
    }
  };
  const luminance = (color) => {
    const channels = [1, 3, 5].map(
      (start) => Number.parseInt(color.slice(start, start + 2), 16) / 255,
    );
    const [red, green, blue] = channels.map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const contrast = (foreground, background) => {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    return (values[0] + 0.05) / (values[1] + 0.05);
  };
  const isPalette = (value) => {
    if (
      !value ||
      typeof value !== "object" ||
      !paletteKeys.every(
        (key) => typeof value[key] === "string" && /^#[0-9a-f]{6}$/i.test(value[key]),
      )
    ) {
      return false;
    }
    return (
      contrast(value.text, value.background) >= 4.5 &&
      contrast(value.text, value.surface) >= 4.5 &&
      contrast(value.textMuted, value.background) >= 4.5 &&
      contrast(value.textMuted, value.surface) >= 4.5 &&
      contrast(value.accent, value.background) >= 3 &&
      contrast(value.accent, value.surface) >= 3
    );
  };
  const isCustomTheme = (value) =>
    value &&
    typeof value.id === "string" &&
    value.id.startsWith("custom-") &&
    typeof value.name === "string" &&
    value.name.trim() &&
    isPalette(value.light) &&
    isPalette(value.dark);
  const isThemeId = (value, customThemes) =>
    presets.includes(value) || customThemes.some((theme) => theme.id === value);
  const validTypography = (value) =>
    value &&
    interfaceFonts.includes(value.interfaceFont) &&
    interfaceSizes.includes(value.interfaceSize) &&
    monospaceFonts.includes(value.monospaceFont) &&
    monospaceSizes.includes(value.monospaceSize) &&
    typeof value.wordWrap === "boolean";

  const readAppearance = () => {
    const customValue = read(KEYS.customThemes);
    const customThemes = Array.isArray(customValue) ? customValue.filter(isCustomTheme) : [];
    const storedSelection = read(KEYS.selection);
    const legacyPreset = read(KEYS.legacyPreset);
    const migrated = isThemeId(legacyPreset, customThemes) ? legacyPreset : "mlsuite";
    const selection =
      storedSelection &&
      isThemeId(storedSelection.light, customThemes) &&
      isThemeId(storedSelection.dark, customThemes)
        ? storedSelection
        : { light: migrated, dark: migrated };
    const currentMode = read(KEYS.mode);
    const legacyMode = read(KEYS.legacyMode);
    const contrast = read(KEYS.contrast);
    return {
      mode: modes.includes(currentMode)
        ? currentMode
        : currentMode === null && modes.includes(legacyMode)
          ? legacyMode
          : "system",
      selection,
      contrast: contrasts.includes(contrast) ? contrast : 100,
      customThemes,
    };
  };
  const resolveMode = (mode) =>
    mode === "system"
      ? matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : mode;
  const paletteVariables = (palette) => ({
    "--theme-page-bg": palette.background,
    "--theme-page-bg-accent": `color-mix(in srgb, ${palette.accent} 10%, transparent)`,
    "--theme-surface-primary": palette.surface,
    "--theme-surface-secondary": `color-mix(in srgb, ${palette.surface}, ${palette.background} 45%)`,
    "--theme-surface-muted": palette.muted,
    "--theme-surface-inverse": palette.text,
    "--theme-text-primary": palette.text,
    "--theme-text-secondary": palette.textMuted,
    "--theme-text-muted": `color-mix(in srgb, ${palette.textMuted}, ${palette.background} 28%)`,
    "--theme-text-inverse": palette.background,
    "--theme-border-soft": `color-mix(in srgb, ${palette.muted}, ${palette.text} 12%)`,
    "--theme-border-strong": `color-mix(in srgb, ${palette.muted}, ${palette.text} 24%)`,
    "--theme-accent-primary": palette.accent,
    "--theme-accent-primary-strong": `color-mix(in srgb, ${palette.accent}, ${palette.text} 18%)`,
    "--theme-accent-quiet": `color-mix(in srgb, ${palette.accent} 14%, transparent)`,
    "--theme-sidebar-bg": `color-mix(in srgb, ${palette.surface} 94%, transparent)`,
  });
  const applyAppearance = (appearance) => {
    const current = readAppearance();
    const safe = {
      mode: modes.includes(appearance.mode) ? appearance.mode : current.mode,
      selection: appearance.selection ?? current.selection,
      contrast: contrasts.includes(appearance.contrast) ? appearance.contrast : current.contrast,
      customThemes: Array.isArray(appearance.customThemes)
        ? appearance.customThemes.filter(isCustomTheme)
        : current.customThemes,
    };
    const resolved = resolveMode(safe.mode);
    const themeId = isThemeId(safe.selection[resolved], safe.customThemes)
      ? safe.selection[resolved]
      : "mlsuite";
    const root = document.documentElement;
    root.classList.toggle("dark", resolved === "dark");
    root.dataset.themePreset = themeId;
    root.dataset.themeLight = safe.selection.light;
    root.dataset.themeDark = safe.selection.dark;
    root.dataset.contrast = String(safe.contrast);
    customProperties.forEach((property) => root.style.removeProperty(property));
    const custom = safe.customThemes.find((theme) => theme.id === themeId);
    if (custom) {
      Object.entries(paletteVariables(custom[resolved])).forEach(([property, value]) =>
        root.style.setProperty(property, value),
      );
    }
    document
      .querySelectorAll('meta[name="theme-color"][media*="color-scheme"]')
      .forEach((meta) =>
        meta.setAttribute(
          "content",
          custom?.[resolved].background ?? (resolved === "dark" ? "#0b0d14" : "#f7f7fb"),
        ),
      );
    return resolved;
  };
  const applyTypography = (value) => {
    const typography = validTypography(value) ? value : defaultTypography;
    const root = document.documentElement;
    root.dataset.interfaceFont = typography.interfaceFont;
    root.dataset.monospaceFont = typography.monospaceFont;
    root.dataset.wordWrap = String(typography.wordWrap);
    root.style.setProperty("--ui-font-size", `${typography.interfaceSize}px`);
    root.style.setProperty("--code-font-size", `${typography.monospaceSize}px`);
    root.style.setProperty("--font-sans", interfaceStacks[typography.interfaceFont]);
    root.style.setProperty("--font-display", interfaceStacks[typography.interfaceFont]);
    root.style.setProperty("--font-mono", monospaceStacks[typography.monospaceFont]);
    save(KEYS.typography, typography);
  };

  const appearance = readAppearance();
  save(KEYS.mode, appearance.mode);
  save(KEYS.selection, appearance.selection);
  save(KEYS.contrast, appearance.contrast);
  save(KEYS.customThemes, appearance.customThemes);
  window.__MLSUITE_APPLY_APPEARANCE__ = applyAppearance;
  window.__MLSUITE_APPLY_THEME__ = (mode) => applyAppearance({ ...readAppearance(), mode });
  applyAppearance(appearance);
  applyTypography(read(KEYS.typography));
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => {
    const current = readAppearance();
    if (current.mode === "system") applyAppearance(current);
  });
})();
