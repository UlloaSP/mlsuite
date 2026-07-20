import type * as Monaco from "monaco-editor";

export type MonacoNamespace = typeof import("monaco-editor");
export type EditorBodyProps = { diffBaseText?: string };
export type MonacoEditorInstance = Monaco.editor.IStandaloneCodeEditor;
export type MonacoMarker = Monaco.editor.IMarker;
export type MonacoMarkerData = Monaco.editor.IMarkerData;
export type MonacoLanguages = typeof Monaco.languages & {
  json: { jsonDefaults: { setDiagnosticsOptions(options: unknown): void } };
};
