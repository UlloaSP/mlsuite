import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vite-plus/test";

const root = new URL("../src", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const tokens = readFileSync(join(root, "shared/ui/tokens.css"), "utf8");

// Theme editors and previews render arbitrary palette values; Monaco only accepts hex themes.
const COLOR_DATA_FILES = new Set([
  "shared/ui/theme-catalog.ts",
  "shared/ui/appearance-state.ts",
  "shared/ui/AppThemeSwatch.tsx",
  "features/user/components/ColorSchemePreview.tsx",
  "features/user/components/ThemeColorFields.tsx",
  "capabilities/editor/editor-options.ts",
]);

const sourceFiles = (directory: string): string[] =>
  readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx|css)$/.test(entry) ? [path] : [];
  });

const files = sourceFiles(root).map((path) => ({
  path: relative(root, path).replaceAll("\\", "/"),
  source: readFileSync(path, "utf8"),
}));

const PALETTE =
  /(?<![\w-])[a-z-]+-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b|(?<![\w-])(?:bg|text|border|from|via|to|ring)-(?:white|black)\b/;
const HEX_CLASS = /-\[#[0-9a-fA-F]{3,8}\]/;

describe("design tokens", () => {
  it("replaces Tailwind's default palette and radius scale", () => {
    expect(tokens).toContain("--color-*: initial;");
    expect(tokens).toContain("--radius-*: initial;");
  });

  it("keeps feature code on semantic color utilities", () => {
    const offenders = files
      .filter(({ path }) => path.endsWith(".tsx") || path.endsWith(".ts"))
      .filter(({ path }) => !COLOR_DATA_FILES.has(path))
      .filter(({ source }) => PALETTE.test(source) || HEX_CLASS.test(source))
      .map(({ path }) => path);

    expect(offenders).toEqual([]);
  });

  it("references only defined color tokens", () => {
    const defined = new Set([...tokens.matchAll(/(--color-[a-z0-9-]+):/g)].map(([, name]) => name));
    const missing = files.flatMap(({ path, source }) =>
      [...source.matchAll(/var\((--color-[a-z0-9-]+)\)/g)]
        .map(([, name]) => name)
        .filter((name) => !defined.has(name))
        .map((name) => `${path}: ${name}`),
    );

    expect(missing).toEqual([]);
  });
});
