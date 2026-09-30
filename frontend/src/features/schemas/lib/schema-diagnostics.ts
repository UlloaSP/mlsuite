/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { parse as parseWithSourceMap } from "json-source-map";
import { getLocation } from "jsonc-parser";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- Type-only Monaco import is erased from runtime.
import type * as Monaco from "monaco-editor";
import { builtinFieldKindsDisplay } from "@/capabilities/prediction-runtime/mlform/builtin-registry";

export interface EditorErrorCard {
  line: number;
  column: number;
  path: string;
  message: string;
  severity: "error" | "warning";
}

const isFieldKindPath = (p: (string | number)[]) =>
  p.length === 3 && p[0] === "fields" && typeof p[1] === "number" && p[2] === "kind";

export const pathToPos = (content: string, pathArr: (string | number)[]) => {
  const pointer = `/${pathArr.map(String).join("/")}`;
  const parsed = parseWithSourceMap(content);
  const loc = parsed.pointers[pointer]?.value ?? { line: 0, column: 0 };
  return { line: loc.line + 1, column: loc.column + 1 };
};

const getBuiltinFieldKindsMessage = (): string =>
  `Valor "kind" no valido. Tipos permitidos: ${builtinFieldKindsDisplay()}.`;

export const getMarkerMessage = (
  content: string,
  marker: Monaco.editor.IMarker & { startOffset: number },
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
