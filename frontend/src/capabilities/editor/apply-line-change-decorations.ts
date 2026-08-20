import type { OnMount } from "@monaco-editor/react";
import { getLineChangeMarkers } from "@/capabilities/editor/line-change-markers";

export function applyLineChangeDecorations(
  editor: Parameters<OnMount>[0],
  previousDecorationIds: string[],
  baseText: string,
  text: string,
): string[] {
  const decorations = getLineChangeMarkers(baseText, text).map((marker) => ({
    range: {
      startLineNumber: marker.line,
      startColumn: 1,
      endLineNumber: marker.line,
      endColumn: 1,
    },
    options: {
      isWholeLine: true,
      className: `schema-editor-line-${marker.kind}`,
      glyphMarginClassName: `schema-editor-glyph-${marker.kind}`,
      linesDecorationsClassName: `schema-editor-gutter-${marker.kind}`,
    },
  }));

  return editor.deltaDecorations(previousDecorationIds, decorations);
}
