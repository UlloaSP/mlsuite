import type { Monaco } from "@monaco-editor/react";
import { editorDarkTheme, editorLightTheme } from "./editor-options";

type ThemeData = Parameters<Monaco["editor"]["defineTheme"]>[1];

export function defineEditorThemes(monaco: Monaco): void {
  monaco.editor.defineTheme("corporate-light", editorLightTheme as ThemeData);
  monaco.editor.defineTheme("corporate-dark", editorDarkTheme as ThemeData);
}

export function setEditorTheme(monaco: Monaco, dark: boolean): void {
  monaco.editor.setTheme(dark ? "corporate-dark" : "corporate-light");
}
