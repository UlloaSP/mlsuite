import type * as Monaco from "monaco-editor";
import { editorDarkTheme, editorLightTheme } from "./editor-options";

type MonacoNamespace = typeof import("monaco-editor");

export function defineEditorThemes(monaco: MonacoNamespace): void {
  monaco.editor.defineTheme(
    "corporate-light",
    editorLightTheme as Monaco.editor.IStandaloneThemeData,
  );
  monaco.editor.defineTheme(
    "corporate-dark",
    editorDarkTheme as Monaco.editor.IStandaloneThemeData,
  );
}

export function setEditorTheme(monaco: MonacoNamespace, dark: boolean): void {
  monaco.editor.setTheme(dark ? "corporate-dark" : "corporate-light");
}
