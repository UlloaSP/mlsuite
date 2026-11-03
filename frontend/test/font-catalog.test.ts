import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import {
  INTERFACE_FONTS,
  INTERFACE_STACKS,
  MONOSPACE_FONTS,
  MONOSPACE_STACKS,
} from "@/shared/ui/font-catalog";
import { WEB_FONT_IDS } from "@/shared/ui/font-faces";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const bootScript = read("../public/appearance-boot.js");
// Every family the installed Fontsource packages declare.
const selfHostedFamilies = new Set(
  ["@fontsource", "@fontsource-variable"].flatMap((scope) =>
    readdirSync(new URL(`../node_modules/${scope}/`, import.meta.url)).flatMap((name) => {
      const css = readdirSync(new URL(`../node_modules/${scope}/${name}/`, import.meta.url))
        .filter((file) => file.endsWith(".css"))
        .map((file) => read(`../node_modules/${scope}/${name}/${file}`))
        .join("\n");
      return [...css.matchAll(/font-family: '([^']+)'/g)].map(([, family]) => family);
    }),
  ),
);

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
  });

  it("self-hosts the faces of every web family a preset names", () => {
    const webFonts = [...INTERFACE_FONTS, ...MONOSPACE_FONTS].filter(({ stack }) =>
      stack.startsWith("'"),
    );

    expect(webFonts.map(({ value }) => value).sort()).toEqual([...WEB_FONT_IDS].sort());
    for (const { stack } of webFonts) {
      expect(selfHostedFamilies).toContain(/^'([^']+)'/.exec(stack)?.[1]);
    }
  });
});
