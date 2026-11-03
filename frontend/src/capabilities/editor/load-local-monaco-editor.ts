type MonacoEditorModule = {
  default: typeof import("@monaco-editor/react").Editor;
};

let editorModulePromise: Promise<MonacoEditorModule> | null = null;

/** Loads Monaco (only what the app uses, see monaco.ts) and binds the React wrapper to it. */
export function loadLocalMonacoEditor(): Promise<MonacoEditorModule> {
  editorModulePromise ??= Promise.all([
    import("./monaco"),
    import("@monaco-editor/react"),
    import("monaco-editor/editor/editor.worker.js?worker"),
    import("monaco-editor/language/json/json.worker.js?worker"),
  ]).then(
    ([{ monaco }, { Editor, loader }, { default: EditorWorker }, { default: JsonWorker }]) => {
      globalThis.MonacoEnvironment = {
        getWorker: (_moduleId, label) => (label === "json" ? new JsonWorker() : new EditorWorker()),
      };
      loader.config({ monaco });
      return { default: Editor };
    },
  );

  return editorModulePromise;
}
