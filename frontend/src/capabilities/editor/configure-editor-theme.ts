import { editorDarkTheme, editorLightTheme } from "./editor-options";

export type MonacoNamespace = typeof import("monaco-editor");
type ThemeData = Parameters<MonacoNamespace["editor"]["defineTheme"]>[1];

export function defineEditorThemes(monaco: MonacoNamespace): void {
  monaco.editor.defineTheme("corporate-light", editorLightTheme as ThemeData);
  monaco.editor.defineTheme("corporate-dark", editorDarkTheme as ThemeData);
}

export function setEditorTheme(monaco: MonacoNamespace, dark: boolean): void {
  monaco.editor.setTheme(dark ? "corporate-dark" : "corporate-light");
}
