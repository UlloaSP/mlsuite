import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import {
  INTERFACE_FONTS,
  INTERFACE_STACKS,
  LEGACY_FONT_IDS,
  MONOSPACE_FONTS,
  MONOSPACE_STACKS,
} from "@/shared/ui/font-catalog";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const bootScript = read("../public/appearance-boot.js");
const fontStylesheet = /href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/.exec(
  read("../index.html"),
)?.[1];

const bootStacks = (name: string) => {
  const body = new RegExp(`const ${name} = \\{([\\s\\S]*?)\\n  \\};`).exec(bootScript)?.[1] ?? "";
  return Object.fromEntries(
    [...body.matchAll(/^\s*"?([a-z0-9-]+)"?: "(.*)",$/gm)].map(([, id, stack]) => [
      id,
      stack.replaceAll("\\'", "'"),
    ]),
  );
};

describe("font catalog", () => {
  it("applies the same presets before first paint as the app does", () => {
    expect(bootStacks("interfaceStacks")).toEqual(INTERFACE_STACKS);
    expect(bootStacks("monospaceStacks")).toEqual(MONOSPACE_STACKS);
    expect(bootStacks("legacyFontIds")).toEqual(LEGACY_FONT_IDS);
  });

  it("declares every web family in the preloaded font stylesheet", () => {
    const families = [...INTERFACE_FONTS, ...MONOSPACE_FONTS]
      .map(({ stack }) => /^'([^']+)'/.exec(stack)?.[1])
      .filter((family) => family !== undefined);

    expect(families.length).toBeGreaterThan(0);
    for (const family of families) {
      expect(fontStylesheet).toContain(`family=${family.replaceAll(" ", "+")}:`);
    }
  });

  it("migrates every legacy id to an existing preset", () => {
    const presets = new Set<string>([...INTERFACE_FONTS, ...MONOSPACE_FONTS].map((f) => f.value));

    expect(Object.values(LEGACY_FONT_IDS).every((id) => presets.has(id))).toBe(true);
  });
});
