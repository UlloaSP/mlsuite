import type { ImageMetadata } from "astro";

type Module = { default: ImageMetadata };

// Screens of the live instance, taken with a demo account and demo data in both color schemes.
const files = import.meta.glob<Module>("../assets/captures/*.webp", { eager: true });

const byName = new Map<string, ImageMetadata>(
  Object.entries(files).map(([path, module]) => [
    path.slice(path.lastIndexOf("/") + 1, -".webp".length),
    module.default,
  ]),
);

export const capture = (name: string, mode: "light" | "dark"): ImageMetadata => {
  const image = byName.get(`${name}-${mode}`);
  if (!image) throw new Error(`Missing ${mode} capture "${name}".`);
  return image;
};
