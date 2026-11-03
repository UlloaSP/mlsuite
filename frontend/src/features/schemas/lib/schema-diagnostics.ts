/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { getLocation } from "jsonc-parser";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- Type-only Monaco import is erased from runtime.
import type { editor } from "monaco-editor/editor";
import { builtinFieldKindsDisplay } from "@/capabilities/prediction-runtime/mlform/builtin-registry";
import { lineIndex, nodeAt, pointerSegments } from "./json-text-positions";

export interface EditorErrorCard {
  line: number;
  column: number;
  path: string;
  message: string;
  severity: "error" | "warning";
}

const isFieldKindPath = (p: (string | number)[]) =>
  p.length === 3 && p[0] === "fields" && typeof p[1] === "number" && p[2] === "kind";

/**
 * Where the value at `path` starts in the text, 1-based; the first line and column when the text
 * does not parse or has no such value.
 */
export const pathToPos = (content: string, path: (string | number)[]) => {
  const node = nodeAt(content, path);
  if (!node) return { line: 1, column: 1 };
  const { lineOf, lineStart } = lineIndex(content);
  const line = lineOf(node.offset);
  return { line: line + 1, column: node.offset - lineStart(line) + 1 };
};

/** Where a JSON pointer's value starts in the text, as `pathToPos` places it. */
export const pointerToPos = (content: string, pointer: string) =>
  pathToPos(content, pointerSegments(pointer));

const getBuiltinFieldKindsMessage = (): string =>
  `Valor "kind" no valido. Tipos permitidos: ${builtinFieldKindsDisplay()}.`;

export const getMarkerMessage = (
  content: string,
  marker: editor.IMarker & { startOffset: number },
  warningSeverity: number,
): EditorErrorCard => {
  const pathArr = getLocation(content, marker.startOffset).path;

  return {
    line: marker.startLineNumber,
    column: marker.startColumn,
    path: pathArr.length ? pathArr.join(".") : "root",
    message: isFieldKindPath(pathArr) ? getBuiltinFieldKindsMessage() : marker.message,
    severity: marker.severity === warningSeverity ? "warning" : "error",
  };
};
