import { readFileSync } from "node:fs";
import { describe, expect, it } from "vite-plus/test";
import { THEME_PRESETS } from "@/shared/ui/theme-catalog";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const css = [
  read("../src/shared/ui/theme-presets.css"),
  read("../src/shared/ui/theme-presets-community.css"),
].join("\n");
const bootScript = read("../public/appearance-boot.js");

const block = (selector: string) => {
  const body = new RegExp(`${selector.replace(/[.[\]"]/g, "\\$&")} \\{([^}]*)\\}`).exec(css)?.[1];
  return Object.fromEntries(
    [...(body ?? "").matchAll(/(--theme-[a-z-]+):\s*([^;]+);/g)].map(([, name, value]) => [
      name,
      value.trim(),
    ]),
  );
};

const luminance = (hex: string) => {
  const [red, green, blue] = [1, 3, 5]
    .map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255)
    .map((channel) => (channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4));
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
};
const contrast = (a: string, b: string) => {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
};

describe("built-in theme presets", () => {
  it("are all known to the boot script", () => {
    for (const { value } of THEME_PRESETS) expect(bootScript).toContain(`"${value}",`);
  });

  it("define a light and a dark palette with readable body text", () => {
    for (const { value } of THEME_PRESETS) {
      for (const selector of [
        `html[data-theme-preset="${value}"]`,
        `html.dark[data-theme-preset="${value}"]`,
      ]) {
        const palette = block(selector);
        const surface = palette["--theme-surface-primary"];
        expect(surface, selector).toMatch(/^#[0-9a-f]{6}$/i);
        expect(contrast(palette["--theme-text-primary"], surface), selector).toBeGreaterThan(7);
        expect(contrast(palette["--theme-text-secondary"], surface), selector).toBeGreaterThan(4.5);
      }
    }
  });
});
