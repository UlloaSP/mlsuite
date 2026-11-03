/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { InterfaceFont, MonospaceFont } from "./font-catalog";

type FontId = InterfaceFont | MonospaceFont;

/*
 * The self-hosted faces (Fontsource, woff2) of every web font in font-catalog.ts. The default
 * interface and monospace fonts are imported with the app; any other family is fetched only once
 * it is chosen. Each stylesheet splits its family by script with unicode-range, so the browser
 * downloads only the files of the characters it draws.
 */
const FACES: Record<Exclude<FontId, "system" | "system-mono">, () => Promise<unknown>> = {
  manrope: () => import("@fontsource-variable/manrope"),
  inter: () => import("@fontsource-variable/inter"),
  geist: () => import("@fontsource-variable/geist"),
  "ibm-plex-sans": () => import("@fontsource-variable/ibm-plex-sans"),
  "source-sans-3": () => import("@fontsource-variable/source-sans-3"),
  figtree: () => import("@fontsource-variable/figtree"),
  "dm-sans": () => import("@fontsource-variable/dm-sans"),
  "atkinson-hyperlegible": () => import("@fontsource-variable/atkinson-hyperlegible-next"),
  // DM Mono and IBM Plex Mono have no variable release: one stylesheet per weight.
  "dm-mono": () =>
    Promise.all([
      import("@fontsource/dm-mono/300.css"),
      import("@fontsource/dm-mono/400.css"),
      import("@fontsource/dm-mono/500.css"),
    ]),
  "jetbrains-mono": () => import("@fontsource-variable/jetbrains-mono"),
  "geist-mono": () => import("@fontsource-variable/geist-mono"),
  "ibm-plex-mono": () =>
    Promise.all([
      import("@fontsource/ibm-plex-mono/300.css"),
      import("@fontsource/ibm-plex-mono/400.css"),
      import("@fontsource/ibm-plex-mono/500.css"),
      import("@fontsource/ibm-plex-mono/600.css"),
      import("@fontsource/ibm-plex-mono/700.css"),
    ]),
  "fira-code": () => import("@fontsource-variable/fira-code"),
  "source-code-pro": () => import("@fontsource-variable/source-code-pro"),
};

/** Fetches the faces of `fonts` that are web fonts; the system stacks need none. */
export const loadFontFaces = (fonts: readonly string[]) =>
  Promise.all(
    fonts
      .filter((font): font is keyof typeof FACES => Object.hasOwn(FACES, font))
      .map((font) => FACES[font]()),
  );

/** The web fonts this module can load, for the catalog's tests. */
export const WEB_FONT_IDS = Object.keys(FACES);
