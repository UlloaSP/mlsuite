// @vitest-environment jsdom

import { describe, expect, it, vi } from "vite-plus/test";

vi.mock("@/shared/ui/resolve-css-color", () => ({
  // Encode the token name so the test can see which token fed which color.
  resolveCssColorHex: (token: string) =>
    `#${token.length.toString(16).padStart(2, "0").repeat(3)}ff`,
}));

const { editorThemeFromTokens } = await import("@/capabilities/editor/configure-editor-theme");

describe("editor theme", () => {
  it("derives every editor color and syntax rule from design tokens", () => {
    const theme = editorThemeFromTokens(true);
    const hexFor = (token: string) => `#${token.length.toString(16).padStart(2, "0").repeat(3)}ff`;

    expect(theme.base).toBe("vs-dark");
    expect(theme.colors["editor.background"]).toBe(hexFor("--color-surface"));
    expect(theme.colors["editorCursor.foreground"]).toBe(hexFor("--color-accent"));
    expect(theme.rules.find((rule) => rule.token === "string.value.json")?.foreground).toBe(
      hexFor("--color-success-fg").slice(1, 7),
    );
    expect(editorThemeFromTokens(false).base).toBe("vs");
  });
});
