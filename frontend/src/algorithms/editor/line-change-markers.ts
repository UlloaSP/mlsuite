/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

export type LineChangeKind = "added" | "modified" | "deleted";

export type LineChangeMarker = {
  line: number;
  kind: LineChangeKind;
};

export function getLineChangeMarkers(baseText: string, currentText: string): LineChangeMarker[] {
  if (!baseText.trim() || baseText === currentText) return [];
  const baseLines = baseText.split("\n");
  const currentLines = currentText.split("\n");
  const length = Math.max(baseLines.length, currentLines.length);
  const markers = new Map<number, LineChangeKind>();

  for (let index = 0; index < length; index += 1) {
    const base = baseLines[index];
    const current = currentLines[index];
    if (base === current) continue;
    const line = Math.min(index + 1, Math.max(1, currentLines.length));
    if (current === undefined) {
      markers.set(line, "deleted");
    } else if (base === undefined) {
      markers.set(index + 1, "added");
    } else {
      markers.set(index + 1, "modified");
    }
  }

  return [...markers].map(([line, kind]) => ({ line, kind }));
}
