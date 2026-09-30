/*
SPDX-License-Identifier: MIT
Copyright (c) 2025 Pablo Ulloa Santin
*/

import type { EditorProps } from "@monaco-editor/react";
import { MONOSPACE_STACKS } from "@/shared/ui/font-catalog";
import type { TypographyPreferences } from "@/shared/ui/typography-state";

export const editorOptions: NonNullable<EditorProps["options"]> = {
  minimap: { enabled: false },
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  lineNumbers: "on",
  roundedSelection: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  insertSpaces: true,
  wordWrap: "on",
  bracketPairColorization: { enabled: true },
  accessibilitySupport: "on",
  smoothScrolling: true,
  cursorBlinking: "smooth",
  renderLineHighlight: "gutter",
};

export const editorOptionsFor = (
  typography: TypographyPreferences,
): NonNullable<EditorProps["options"]> => ({
  ...editorOptions,
  fontFamily: MONOSPACE_STACKS[typography.monospaceFont],
  fontSize: typography.monospaceSize,
  wordWrap: typography.wordWrap ? "on" : "off",
});
