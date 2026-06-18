/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import { parse as parseWithSourceMap } from "json-source-map";
import { getLocation } from "jsonc-parser";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- MarkerSeverity enum is tiny and needed by synchronous marker formatting.
import { MarkerSeverity } from "monaco-editor";
// react-doctor-disable-next-line react-doctor/prefer-dynamic-import -- Type-only Monaco import is erased from runtime.
import type * as Monaco from "monaco-editor";
import { builtinFieldKindsDisplay } from "../../mlform/builtin-registry";

/**
 * EditorErrorCard: describes the public data contract consumed or returned by this algorithm.
 *
 * Purpose: turns schema validation paths and editor markers into user-facing editor diagnostics.
 * @returns Type-only export; no runtime value is emitted.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export interface EditorErrorCard {
  line: number;
  column: number;
  path: string;
  message: string;
  severity: "error" | "warning";
}

/** isFieldKindPath: internal predicate for editor schema diagnostics. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const isFieldKindPath = (p: (string | number)[]) =>
  p.length === 3 && p[0] === "fields" && typeof p[1] === "number" && p[2] === "kind";

/**
 * pathToPos: performs the exported transformation for this algorithm.
 *
 * Purpose: turns schema validation paths and editor markers into user-facing editor diagnostics.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const pathToPos = (content: string, pathArr: (string | number)[]) => {
  const pointer = `/${pathArr.map(String).join("/")}`;
  const parsed = parseWithSourceMap(content);
  const loc = parsed.pointers[pointer]?.key ||
    parsed.pointers[pointer]?.value || {
      line: 0,
      column: 0,
    };
  return { line: loc.line + 1, column: loc.column + 1 };
};

/** getBuiltinFieldKindsMessage: internal lookup helper for editor schema diagnostics. @remarks Args: none; side cases: nullish or malformed optional values stay local to this helper unless caller enforces errors. @returns Internal derived value/cache/side-effect result for enclosing algorithm. @throws Propagates errors from called validators, parsers, browser APIs, or explicit domain guards. */
const getBuiltinFieldKindsMessage = (): string =>
  `Valor "kind" no valido. Tipos permitidos: ${builtinFieldKindsDisplay()}.`;

/**
 * getMarkerMessage: extracts a derived value without mutating input
 *
 * Purpose: turns schema validation paths and editor markers into user-facing editor diagnostics.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getMarkerMessage = (
  content: string,
  marker: Monaco.editor.IMarker & { startOffset: number },
): EditorErrorCard => {
  const pathArr = getLocation(content, marker.startOffset).path;

  return {
    line: marker.startLineNumber,
    column: marker.startColumn,
    path: pathArr.length ? pathArr.join(".") : "root",
    message: isFieldKindPath(pathArr) ? getBuiltinFieldKindsMessage() : marker.message,
    severity: marker.severity === MarkerSeverity.Warning ? "warning" : "error",
  };
};

/**
 * getCompatMarkerStartColumn: extracts a derived value without mutating input
 *
 * Purpose: turns schema validation paths and editor markers into user-facing editor diagnostics.
 * @param content - Input consumed by getCompatMarkerStartColumn; uses the turns schema validation paths and editor markers into user-facing editor diagnostics contract.
 * @param line - Input consumed by getCompatMarkerStartColumn; uses the turns schema validation paths and editor markers into user-facing editor diagnostics contract.
 * @param fallbackColumn - Input consumed by getCompatMarkerStartColumn; uses the turns schema validation paths and editor markers into user-facing editor diagnostics contract.
 * @returns New normalized/derived value; input objects are not mutated unless explicitly documented by called platform APIs.
 * @throws Does not intentionally throw; callers should still guard platform/runtime exceptions.
 * @remarks Side cases/effects: Treats nullish, missing, or malformed optional records as absent unless the domain contract requires an error.
 */
export const getCompatMarkerStartColumn = (
  content: string,
  line: number,
  fallbackColumn: number,
) => {
  const lineContent = content.split("\n")[line - 1] || "";
  const colonIdx = lineContent.indexOf(":");

  if (colonIdx === -1) {
    return fallbackColumn;
  }

  const quoteIdx = lineContent.indexOf('"', colonIdx);
  return quoteIdx !== -1 ? quoteIdx + 1 : fallbackColumn;
};
