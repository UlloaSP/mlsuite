import { useAtomValue } from "jotai";
import {
  contrastAtom,
  customThemesAtom,
  themeSelectionAtom,
  themeWithHtmlAtom,
} from "@/shared/ui/appearance-state";
import { resolveCssColorHex } from "@/shared/ui/resolve-css-color";

export type MonacoNamespace = typeof import("monaco-editor");
type ThemeData = Parameters<MonacoNamespace["editor"]["defineTheme"]>[1];

const THEME_NAME = "mlsuite";

// Editor roles mapped onto design tokens, so the editor follows every theme.
const COLOR_TOKENS = {
  "editor.background": "--color-surface",
  "editor.foreground": "--color-fg",
  "editorGutter.background": "--color-surface",
  "editor.lineHighlightBackground": "--color-surface-subtle",
  "editor.selectionBackground": "--color-accent-subtle",
  "editor.selectionHighlightBackground": "--color-accent-subtle",
  "editorCursor.foreground": "--color-accent",
  "editorLineNumber.foreground": "--color-fg-muted",
  "editorLineNumber.activeForeground": "--color-fg",
  "editorWidget.background": "--color-surface-raised",
  "editorWidget.border": "--color-line",
} as const;

const SYNTAX_TOKENS = [
  { token: "comment", color: "--color-fg-muted", fontStyle: "italic" },
  { token: "string.key.json", color: "--color-fg" },
  { token: "string.value.json", color: "--color-success-fg" },
  { token: "number", color: "--color-info-fg" },
  { token: "keyword.json", color: "--color-warning-fg" },
  { token: "delimiter", color: "--color-fg-secondary" },
] as const;

/** Builds the Monaco theme from the tokens currently applied to the document. */
export function editorThemeFromTokens(dark: boolean): ThemeData {
  const colors = Object.fromEntries(
    Object.entries(COLOR_TOKENS).flatMap(([key, token]) => {
      const hex = resolveCssColorHex(token);
      return hex ? [[key, hex]] : [];
    }),
  );
  const rules = SYNTAX_TOKENS.flatMap(({ token, color, ...style }) => {
    const hex = resolveCssColorHex(color);
    // Syntax rules take opaque #rrggbb without the hash.
    return hex ? [{ token, foreground: hex.slice(1, 7), ...style }] : [];
  });
  return { base: dark ? "vs-dark" : "vs", inherit: true, rules, colors };
}

/** (Re)defines and applies the token theme; call after any appearance change. */
export function applyEditorTheme(monaco: MonacoNamespace, dark: boolean): void {
  monaco.editor.defineTheme(THEME_NAME, editorThemeFromTokens(dark));
  monaco.editor.setTheme(THEME_NAME);
}

/** Changes whenever mode, palette, custom themes, or contrast change the tokens. */
export function useEditorAppearance() {
  const mode = useAtomValue(themeWithHtmlAtom);
  const selection = useAtomValue(themeSelectionAtom);
  const contrast = useAtomValue(contrastAtom);
  const customThemes = useAtomValue(customThemesAtom);
  return {
    dark: mode === "dark",
    key: JSON.stringify([mode, selection, contrast, customThemes]),
  };
}
