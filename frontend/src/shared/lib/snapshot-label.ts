/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

/**
 * "Baseline · v3", or just "v3" when the snapshot is unnamed or named after its
 * number (the default), so labels never read "v1 · v1".
 */
export const snapshotLabel = (name: string | null | undefined, version: number) => {
  const number = `v${version}`;
  const trimmed = name?.trim();
  return !trimmed || trimmed.toLowerCase() === number ? number : `${trimmed} · ${number}`;
};
