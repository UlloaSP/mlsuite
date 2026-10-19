import type { ImageMetadata } from "astro";

// Captures of the live instance in both colour schemes, taken at 2x by the demo account.
const images = import.meta.glob<{ default: ImageMetadata }>("../assets/captures/*.png", {
  eager: true,
});
export const capture = (name: string, mode: "light" | "dark") => {
  const image = images[`../assets/captures/${name}-${mode}.png`]?.default;
  if (!image) throw new Error(`Missing capture: ${name}-${mode}`);
  return image;
};
