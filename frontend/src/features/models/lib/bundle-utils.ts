/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { Bundle } from "./bundle-types";

export const BUNDLE_EXT = ".mlbundle";

export function getStem(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

export function isBundleFile(name: string): boolean {
  return name.toLowerCase().endsWith(BUNDLE_EXT);
}

export function slugToTitle(stem: string): string {
  return stem.replace(/[_-]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

/** Lists each new file as an unsaved bundle; a file already listed by name is not added twice. */
export function appendBundleFiles(previous: Bundle[], files: File[], firstId: number): Bundle[] {
  const next = [...previous];
  let nextId = firstId;
  for (const modelFile of files) {
    if (next.some((bundle) => bundle.modelFile.name === modelFile.name)) continue;
    next.push({
      id: nextId++,
      modelFile,
      name: slugToTitle(getStem(modelFile.name)),
      saved: false,
      preparing: false,
      saving: false,
    });
  }
  return next;
}
