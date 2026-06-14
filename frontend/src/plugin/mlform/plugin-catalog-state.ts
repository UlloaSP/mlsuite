/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { atom } from "jotai";

export const pluginCatalogVersionAtom = atom(0);
export const bumpPluginCatalogVersionAtom = atom(null, (_get, set) => {
  set(pluginCatalogVersionAtom, (current) => current + 1);
});
